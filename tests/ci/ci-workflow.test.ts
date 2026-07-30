import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflowPath = resolve(process.cwd(), ".github/workflows/ci.yml");
const workflowText = readFileSync(workflowPath, "utf8");
const workflow = parse(workflowText) as Record<string, unknown>;

const ACTION_CHECKOUT = /^actions\/checkout@[0-9a-f]{40}$/;
const ACTION_SETUP_NODE = /^actions\/setup-node@[0-9a-f]{40}$/;
const ACTION_SETUP_BUN = /^oven-sh\/setup-bun@[0-9a-f]{40}$/;

type Step = {
  uses?: string;
  with?: Record<string, unknown>;
  run?: string;
};

type Job = {
  name?: string;
  permissions?: unknown;
  steps?: Step[];
  services?: Record<string, { image?: string; env?: Record<string, string>; ports?: string[] }>;
  env?: Record<string, string>;
};

type StepShape = {
  uses?: RegExp;
  with?: Record<string, unknown>;
  run?: string;
};

function assertJob(jobName: string, job: Job, expected: StepShape[]): void {
  const steps = job.steps ?? [];
  expect(steps.length, `job ${jobName} step count`).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    const want = expected[i]!;
    const step = steps[i]!;
    if (want.uses) {
      expect(step.uses, `job ${jobName} step ${i} uses`).toMatch(want.uses);
    }
    if (want.with) {
      expect(step.with ?? {}, `job ${jobName} step ${i} with`).toEqual(want.with);
    }
    if (want.run !== undefined) {
      expect(step.run, `job ${jobName} step ${i} run`).toBe(want.run);
    }
  }
}

const CHECKOUT_STEP: StepShape = {
  uses: ACTION_CHECKOUT,
  with: { "persist-credentials": false },
};

const SETUP_NODE_STEP: StepShape = {
  uses: ACTION_SETUP_NODE,
  with: { "node-version": "24" },
};

const SETUP_BUN_STEP: StepShape = {
  uses: ACTION_SETUP_BUN,
  with: { "bun-version-file": "package.json" },
};

const INSTALL_STEP: StepShape = {
  run: "bun install --frozen-lockfile",
};

const jobs = workflow.jobs as Record<string, Job>;

describe("ci workflow contract", () => {
  it("triggers on push to main and on any pull_request", () => {
    const on = workflow.on as Record<string, unknown>;
    expect(on).toBeDefined();
    expect(on.push).toBeDefined();
    expect(on.pull_request).toBeDefined();
    const push = on.push as { branches?: string[] };
    expect(push.branches).toContain("main");
  });

  it("cancels in-progress runs for the same concurrency group", () => {
    const concurrency = workflow.concurrency as Record<string, unknown>;
    expect(concurrency, "concurrency block is required").toBeDefined();
    expect(concurrency["cancel-in-progress"]).toBe(true);
    expect(typeof concurrency.group).toBe("string");
    expect(concurrency.group as string).toContain("${{ github.workflow }}");
  });

  it("declares exactly four top-level jobs: build, lint, test, typecheck", () => {
    expect(Object.keys(jobs).sort()).toEqual(["build", "lint", "test", "typecheck"]);
  });

  it("pins every third-party action to an immutable 40-char SHA", () => {
    for (const [jobName, job] of Object.entries(jobs)) {
      for (const step of job.steps ?? []) {
        if (typeof step.uses !== "string") continue;
        if (step.uses.startsWith("./") || step.uses.startsWith("docker://")) continue;
        expect(
          step.uses,
          `job ${jobName} uses '${step.uses}' — must be a fully SHA-pinned action reference (owner/repo@<40 lowercase hex>)`,
        ).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/);
      }
    }
  });

  it("lint job: checkout, setup-node (node 24), setup-bun (bun-version-file), install, run lint", () => {
    assertJob("lint", jobs.lint!, [
      CHECKOUT_STEP,
      SETUP_NODE_STEP,
      SETUP_BUN_STEP,
      INSTALL_STEP,
      { run: "bun run lint" },
    ]);
  });

  it("typecheck job: checkout, setup-node (node 24), setup-bun (bun-version-file), install, run typecheck", () => {
    assertJob("typecheck", jobs.typecheck!, [
      CHECKOUT_STEP,
      SETUP_NODE_STEP,
      SETUP_BUN_STEP,
      INSTALL_STEP,
      { run: "bun run typecheck" },
    ]);
  });

  it("test job: checkout, setup-node (node 24), setup-bun (bun-version-file), install, migrate, run test", () => {
    assertJob("test", jobs.test!, [
      CHECKOUT_STEP,
      SETUP_NODE_STEP,
      SETUP_BUN_STEP,
      INSTALL_STEP,
      { run: "bun run db:migrate" },
      { run: "bun run test" },
    ]);
  });

  // Ohne PostgreSQL-Service und TEST_DATABASE_URL ueberspringt
  // tests/raum/raum-postgres.integration.test.ts den kompletten
  // M2-Akzeptanzpfad (#55) still, und das Test-Gate waere gruen, ohne
  // Persistenz, Migration, Ownership und Reload je geprueft zu haben.
  it("test job runs a real PostgreSQL service so the M2 acceptance path cannot be silently skipped", () => {
    const testJob = jobs.test!;
    const postgres = testJob.services?.postgres;
    expect(postgres, "test job must declare a postgres service container").toBeDefined();
    expect(postgres!.image, "postgres service image").toMatch(/^postgres:/);
    expect(postgres!.ports, "postgres service must expose 5432 to the runner").toContain("5432:5432");

    const testDatabaseUrl = testJob.env?.TEST_DATABASE_URL;
    expect(
      testDatabaseUrl,
      "TEST_DATABASE_URL must be set, otherwise describe.skipIf skips the acceptance suite",
    ).toBeDefined();
    expect(testDatabaseUrl).toMatch(/^postgres:\/\//);
    expect(testJob.env?.DATABASE_URL, "DATABASE_URL is required by bun run db:migrate").toMatch(
      /^postgres:\/\//,
    );
  });

  // Ein Passwort im Workflow waere ein hartcodiertes Credential im
  // Repository und laesst den Secret-Scanner (GitGuardian) fehlschlagen.
  // Der ephemere Service-Container braucht keins: trust-Auth genuegt.
  it("keeps the postgres service password-free so no credential is committed", () => {
    const testJob = jobs.test!;
    const postgres = testJob.services!.postgres!;
    expect(
      postgres.env?.POSTGRES_PASSWORD,
      "postgres service must not hardcode a password",
    ).toBeUndefined();
    expect(postgres.env?.POSTGRES_HOST_AUTH_METHOD).toBe("trust");
    for (const key of ["DATABASE_URL", "TEST_DATABASE_URL"] as const) {
      expect(testJob.env?.[key], `${key} must not embed a password`).not.toMatch(/:[^/@]+@/);
    }
  });

  it("build job: checkout, setup-node (node 24), setup-bun (bun-version-file), install, run build", () => {
    assertJob("build", jobs.build!, [
      CHECKOUT_STEP,
      SETUP_NODE_STEP,
      SETUP_BUN_STEP,
      INSTALL_STEP,
      { run: "bun run build" },
    ]);
  });

  it("gives every job a human-readable display name matching its job id", () => {
    expect(jobs.build?.name).toBe("Build");
    expect(jobs.lint?.name).toBe("Lint");
    expect(jobs.typecheck?.name).toBe("Typecheck");
    expect(jobs.test?.name).toBe("Test");
  });

  it("keeps workflow-level permissions to contents: read and forbids per-job overrides", () => {
    const permissions = workflow.permissions as Record<string, string>;
    expect(permissions).toEqual({ contents: "read" });
    for (const [jobName, job] of Object.entries(jobs)) {
      expect(
        job.permissions,
        `job ${jobName} must not override workflow permissions`,
      ).toBeUndefined();
    }
  });
});
