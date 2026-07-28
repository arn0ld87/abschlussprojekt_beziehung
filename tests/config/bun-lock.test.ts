import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const lockPath = resolve(process.cwd(), "bun.lock");
const lockText = readFileSync(lockPath, "utf8");

/**
 * bun.lock is JSONC (JSON with trailing commas). Strip trailing commas before
 * standard JSON.parse so the fixture can be asserted on structurally instead
 * of via brittle substring matching.
 */
function parseBunLock(text: string): {
  lockfileVersion: number;
  workspaces: {
    "": {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
  };
  packages: Record<string, unknown[]>;
} {
  const withoutTrailingCommas = text.replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(withoutTrailingCommas);
}

const lock = parseBunLock(lockText);
const workspace = lock.workspaces[""];

function majorOf(range: string): string {
  const match = /(\d+)(?:\.\d+){0,2}/.exec(range);
  if (!match) throw new Error(`could not extract a major version from "${range}"`);
  return match[1]!;
}

function resolvedVersionOf(packages: Record<string, unknown[]>, name: string): string {
  const entry = packages[name];
  if (!entry) throw new Error(`packages entry for "${name}" not found in bun.lock`);
  const spec = entry[0] as string;
  const version = spec.slice(name.length + 1);
  return version;
}

describe("bun.lock contract (M0 #27 Next.js 16 / React 19 upgrade)", () => {
  it("parses as JSONC (trailing commas stripped) into a well-formed object", () => {
    expect(lock).toBeTypeOf("object");
    expect(lock.lockfileVersion).toBe(1);
  });

  it("pins the workspace runtime dependencies to next 16.2.11, react/react-dom ^19, and pg", () => {
    expect(workspace.dependencies.next).toBe("16.2.11");
    expect(workspace.dependencies.react).toBe("^19.0.0");
    expect(workspace.dependencies["react-dom"]).toBe("^19.0.0");
    expect(workspace.dependencies.pg).toBeDefined();
    expect(workspace.dependencies.pg.length).toBeGreaterThan(0);
  });

  it("pins the workspace devDependencies to the ESLint 9 flat-config toolchain", () => {
    expect(workspace.devDependencies.eslint).toBe("^9.0.0");
    expect(workspace.devDependencies["eslint-config-next"]).toBe("16.2.11");
    expect(workspace.devDependencies["@next/eslint-plugin-next"]).toBe("16.2.11");
    expect(workspace.devDependencies["typescript-eslint"]).toBe("^8.0.0");
    expect(workspace.devDependencies["@eslint/js"]).toBe("^9.0.0");
  });

  it("resolves next, react, react-dom, and pg in the packages table to versions matching the declared ranges", () => {
    expect(resolvedVersionOf(lock.packages, "next")).toBe("16.2.11");
    expect(majorOf(resolvedVersionOf(lock.packages, "react"))).toBe(
      majorOf(workspace.dependencies.react),
    );
    expect(majorOf(resolvedVersionOf(lock.packages, "react-dom"))).toBe(
      majorOf(workspace.dependencies["react-dom"]),
    );
    expect(majorOf(resolvedVersionOf(lock.packages, "pg"))).toBe(
      majorOf(workspace.dependencies.pg),
    );
  });

  it("resolves eslint in the packages table to the 9.x line (no longer 8.x)", () => {
    const resolved = resolvedVersionOf(lock.packages, "eslint");
    expect(majorOf(resolved)).toBe("9");
  });

  it("no longer carries the ESLint 8-only @humanwhocodes/config-array package", () => {
    expect(lock.packages["@humanwhocodes/config-array"]).toBeUndefined();
  });

  it("carries the ESLint 9 flat-config @eslint/config-array replacement package", () => {
    expect(lock.packages["@eslint/config-array"]).toBeDefined();
  });
});