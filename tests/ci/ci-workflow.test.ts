import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflowPath = resolve(process.cwd(), ".github/workflows/ci.yml");
const workflowText = readFileSync(workflowPath, "utf8");
const workflow = parse(workflowText) as Record<string, unknown>;

const ACTION_CHECKOUT = /^actions\/checkout@[0-9a-f]{40}$/;
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

  it("lint job: checkout, setup-bun (bun-version-file), install, run lint", () => {
    assertJob("lint", jobs.lint!, [
      CHECKOUT_STEP,
      SETUP_BUN_STEP,
      INSTALL_STEP,
      { run: "bun run lint" },
    ]);
  });

  it("typecheck job: checkout, setup-bun (bun-version-file), install, run typecheck", () => {
    assertJob("typecheck", jobs.typecheck!, [
      CHECKOUT_STEP,
      SETUP_BUN_STEP,
      INSTALL_STEP,
      { run: "bun run typecheck" },
    ]);
  });

  it("test job: checkout, setup-bun (bun-version-file), install, run test", () => {
    assertJob("test", jobs.test!, [
      CHECKOUT_STEP,
      SETUP_BUN_STEP,
      INSTALL_STEP,
      { run: "bun run test" },
    ]);
  });

  it("build job: checkout, setup-bun (bun-version-file), install, run build", () => {
    assertJob("build", jobs.build!, [
      CHECKOUT_STEP,
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
