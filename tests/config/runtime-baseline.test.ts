import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const pkgPath = resolve(process.cwd(), "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
  engines: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

type Semver = { major: number; minor: number; patch: number };

/**
 * Parses a strict semver triplet ("24.0.0") without regex. Returns null for
 * anything that is not exactly three numeric dot-separated segments.
 */
function parseSemverTriplet(text: string): Semver | null {
  const parts = text.split(".");
  if (parts.length !== 3) return null;
  const numbers = parts.map((part) => {
    if (part.length === 0) return Number.NaN;
    for (const char of part) {
      if (char < "0" || char > "9") return Number.NaN;
    }
    return Number.parseInt(part, 10);
  });
  if (numbers.some((n) => Number.isNaN(n))) return null;
  return { major: numbers[0]!, minor: numbers[1]!, patch: numbers[2]! };
}

/**
 * Extracts the inclusive minimum version of a simple ">=" range. Returns null
 * for range shapes this baseline does not use (compound, hyphen, wildcards).
 */
function minimumOfGteRange(range: string): Semver | null {
  if (!range.startsWith(">=")) return null;
  return parseSemverTriplet(range.slice(2).trim());
}

/**
 * Splits a patch-flexible range ("~16.2.11" or "^16.2.11") into its operator
 * and pinned base version. Returns null for exact pins or any other shape.
 */
function splitPatchFlexibleRange(range: string): { operator: string; base: Semver } | null {
  const operator = range.charAt(0);
  if (operator !== "~" && operator !== "^") return null;
  const base = parseSemverTriplet(range.slice(1));
  if (!base) return null;
  return { operator, base };
}

describe("runtime baseline (M0 #31 node lts and patchable next)", () => {
  it("requires a supported Node LTS line: engines.node minimum is >= 24.0.0", () => {
    const minimum = minimumOfGteRange(pkg.engines.node ?? "");
    expect(minimum, "engines.node must be a simple '>=x.y.z' range").not.toBeNull();
    expect(minimum!.major).toBeGreaterThanOrEqual(24);
  });

  it("declares next as a patch-flexible range based on 16.2.11 (no exact pin)", () => {
    const range = splitPatchFlexibleRange(pkg.dependencies.next ?? "");
    expect(range, "next must use a '~' or '^' range, not an exact pin").not.toBeNull();
    expect(range!.base).toEqual({ major: 16, minor: 2, patch: 11 });
  });

  it("keeps eslint-config-next and @next/eslint-plugin-next on the identical range as next", () => {
    const nextRange = pkg.dependencies.next;
    expect(pkg.devDependencies["eslint-config-next"]).toBe(nextRange);
    expect(pkg.devDependencies["@next/eslint-plugin-next"]).toBe(nextRange);
  });

  it("runs every ci.yml job on the same Node major version as engines.node", () => {
    const workflow = parse(
      readFileSync(resolve(process.cwd(), ".github/workflows/ci.yml"), "utf8"),
    ) as { jobs: Record<string, { steps?: { uses?: string; with?: Record<string, unknown> }[] }> };
    const minimum = minimumOfGteRange(pkg.engines.node ?? "");
    expect(minimum).not.toBeNull();
    const jobs = Object.entries(workflow.jobs);
    expect(jobs.length).toBeGreaterThan(0);
    for (const [jobName, job] of jobs) {
      const setupNode = (job.steps ?? []).find((step) =>
        typeof step.uses === "string" && step.uses.startsWith("actions/setup-node@"),
      );
      expect(setupNode, `job ${jobName} must pin Node via actions/setup-node`).toBeDefined();
      const nodeVersion = String(setupNode!.with?.["node-version"] ?? "");
      const major = parseSemverTriplet(`${nodeVersion}.0.0`.split(".").slice(0, 3).join("."));
      expect(
        Number(nodeVersion.split(".")[0]),
        `job ${jobName} Node major must equal engines.node minimum major`,
      ).toBe(minimum!.major);
      expect(major).not.toBeNull();
    }
  });
});
