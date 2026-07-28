import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pkgPath = resolve(process.cwd(), "package.json");
const pkgText = readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(pkgText) as {
  engines: Record<string, string>;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

describe("package.json contract (M0 #27 foundation baseline)", () => {
  it("is valid JSON ending with a single trailing newline", () => {
    expect(pkgText.endsWith("}\n")).toBe(true);
    expect(pkgText.endsWith("}\n\n")).toBe(false);
  });

  it("requires Node >= 24.0.0 (raised from >=20.9.0 in M0 #31 after the Node 20 EOL)", () => {
    expect(pkg.engines.node).toBe(">=24.0.0");
  });

  it("declares exactly the dev/build/start/lint/typecheck/test scripts", () => {
    expect(pkg.scripts).toEqual({
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "eslint . --max-warnings=0",
      typecheck: "next typegen && tsc --noEmit",
      test: "vitest run",
    });
  });

  it("keeps the test script on vitest run (no watch flag leaking in CI)", () => {
    expect(pkg.scripts.test).toBe("vitest run");
    expect(pkg.scripts.test).not.toContain("--watch");
  });

  it("runs lint through the flat-config eslint CLI with zero tolerated warnings", () => {
    expect(pkg.scripts.lint).toBe("eslint . --max-warnings=0");
    expect(pkg.scripts.lint).not.toContain("next lint");
  });

  it("allows patch updates for next on the 16.2.11 LTS line (M0 #31)", () => {
    expect(pkg.dependencies.next).toBe("~16.2.11");
  });

  it("upgrades react and react-dom to the ^19.0.0 line", () => {
    expect(pkg.dependencies.react).toBe("^19.0.0");
    expect(pkg.dependencies["react-dom"]).toBe("^19.0.0");
  });

  it("declares next, react, react-dom, and pg as runtime dependencies", () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      "next",
      "pg",
      "react",
      "react-dom",
    ]);
  });

  it("adds pg as a runtime dependency for the M0 #20 healthcheck probe", () => {
    expect(pkg.dependencies.pg).toBeDefined();
    expect(pkg.dependencies.pg.length).toBeGreaterThan(0);
  });

  it("upgrades the eslint toolchain to the flat-config-compatible 9.x/8.x lines", () => {
    expect(pkg.devDependencies.eslint).toBe("^9.0.0");
    expect(pkg.devDependencies["eslint-config-next"]).toBe("~16.2.11");
    expect(pkg.devDependencies["@next/eslint-plugin-next"]).toBe("~16.2.11");
    expect(pkg.devDependencies["@eslint/js"]).toBe("^9.0.0");
    expect(pkg.devDependencies["typescript-eslint"]).toBe("^8.0.0");
  });

  it("keeps @types/react and @types/react-dom aligned with React 19", () => {
    expect(pkg.devDependencies["@types/react"]).toBe("^19.0.0");
    expect(pkg.devDependencies["@types/react-dom"]).toBe("^19.0.0");
  });

  it("keeps typescript pinned to an exact version for reproducible builds", () => {
    expect(pkg.devDependencies.typescript).toBe("5.6.3");
    expect(pkg.devDependencies.typescript.startsWith("^")).toBe(false);
  });

  it("keeps vitest and yaml versions untouched by the upgrade", () => {
    expect(pkg.devDependencies.vitest).toBe("2.1.8");
    expect(pkg.devDependencies.yaml).toBe("^2.9.0");
  });

  it("does not depend on the removed eslint-plugin/eslint-config for the old ESLint 8 line", () => {
    expect(pkg.devDependencies.eslint.startsWith("^8")).toBe(false);
  });
});
