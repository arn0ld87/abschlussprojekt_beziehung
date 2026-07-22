import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
);

describe("ci workflow contract", () => {
  it("triggers on push and pull_request", () => {
    expect(workflow).toMatch(/^on:\s*$/m);
    expect(workflow).toMatch(/^\s+push:\s*$/m);
    expect(workflow).toMatch(/^\s+pull_request:\s*$/m);
  });

  it("declares exactly three top-level jobs: lint, typecheck, test", () => {
    const jobHeaderRegex = /^  (lint|typecheck|test):\s*$/gm;
    const headers = workflow.match(jobHeaderRegex) ?? [];
    expect(headers).toHaveLength(3);
  });

  it("uses persist-credentials false on every checkout step", () => {
    const checkoutBlocks =
      workflow.match(
        /uses:\s+actions\/checkout@[^\n]+\n\s+with:\s*\n\s+persist-credentials:\s*false/g,
      ) ?? [];
    expect(checkoutBlocks.length).toBe(3);
  });

  it("keeps contents: read at the workflow level", () => {
    expect(workflow).toMatch(/^permissions:\s*$/m);
    expect(workflow).toMatch(/^\s+contents:\s+read\s*$/m);
  });
});
