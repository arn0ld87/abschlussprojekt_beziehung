import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflowPath = resolve(process.cwd(), ".github/workflows/ci.yml");
const workflowText = readFileSync(workflowPath, "utf8");
const workflow = parse(workflowText) as Record<string, unknown>;

type Job = {
  permissions?: unknown;
  steps?: Array<{ uses?: string; with?: Record<string, unknown> }>;
};

describe("ci workflow contract", () => {
  it("triggers on push to main and on any pull_request", () => {
    const on = workflow.on as Record<string, unknown>;
    expect(on).toBeDefined();
    expect(on.push).toBeDefined();
    expect(on.pull_request).toBeDefined();
    const push = on.push as { branches?: string[] };
    expect(push.branches).toContain("main");
  });

  it("declares exactly three top-level jobs: lint, typecheck, test", () => {
    const jobs = workflow.jobs as Record<string, unknown>;
    expect(Object.keys(jobs).sort()).toEqual(["lint", "test", "typecheck"]);
  });

  it("uses persist-credentials false on every actions/checkout step", () => {
    const jobs = workflow.jobs as Record<string, Job>;
    const checkoutSteps: Array<{ jobName: string; with: Record<string, unknown> }> = [];
    for (const [jobName, job] of Object.entries(jobs)) {
      for (const step of job.steps ?? []) {
        if (typeof step.uses === "string" && step.uses.startsWith("actions/checkout@")) {
          checkoutSteps.push({ jobName, with: step.with ?? {} });
        }
      }
    }
    expect(checkoutSteps.length).toBeGreaterThanOrEqual(1);
    for (const step of checkoutSteps) {
      expect(step.with["persist-credentials"]).toBe(false);
    }
  });

  it("keeps workflow-level permissions to contents: read and forbids per-job overrides", () => {
    const permissions = workflow.permissions as Record<string, string>;
    expect(permissions).toEqual({ contents: "read" });
    const jobs = workflow.jobs as Record<string, Job>;
    for (const [jobName, job] of Object.entries(jobs)) {
      expect(
        job.permissions,
        `job ${jobName} must not override workflow permissions`,
      ).toBeUndefined();
    }
  });
});