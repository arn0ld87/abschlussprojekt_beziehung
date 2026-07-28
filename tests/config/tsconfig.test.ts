import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tsconfigPath = resolve(process.cwd(), "tsconfig.json");
const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf8")) as {
  compilerOptions: Record<string, unknown>;
  include: string[];
  exclude: string[];
};

describe("tsconfig.json contract (M0 #27 foundation baseline)", () => {
  it("keeps the jsx: react-jsx setting enforced by the Next.js 16 toolchain", () => {
    expect(tsconfig.compilerOptions.jsx).toBe("react-jsx");
    expect(tsconfig.compilerOptions.jsx).not.toBe("preserve");
  });

  it("keeps strict mode and noEmit for the Next.js App Router setup", () => {
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.noEmit).toBe(true);
  });

  it("keeps bundler module resolution and ES2022 target", () => {
    expect(tsconfig.compilerOptions.moduleResolution).toBe("bundler");
    expect(tsconfig.compilerOptions.target).toBe("ES2022");
  });

  it("includes both the classic and the new dev-mode Next.js generated route types", () => {
    expect(tsconfig.include).toContain(".next/types/**/*.ts");
    expect(tsconfig.include).toContain(".next/dev/types/**/*.ts");
  });

  it("still includes the app, src, and tests source trees plus config files", () => {
    expect(tsconfig.include).toEqual(
      expect.arrayContaining([
        "next-env.d.ts",
        "app/**/*.ts",
        "app/**/*.tsx",
        "src/**/*.ts",
        "src/**/*.tsx",
        "tests/**/*.ts",
        "tests/**/*.tsx",
        "vitest.config.ts",
        "next.config.mjs",
      ]),
    );
  });

  it("excludes node_modules and the Next.js build cache", () => {
    expect(tsconfig.exclude).toEqual(["node_modules", ".next/cache"]);
  });
});
