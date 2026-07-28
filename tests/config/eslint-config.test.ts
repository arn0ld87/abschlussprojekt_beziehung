import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const eslintConfigPath = resolve(process.cwd(), "eslint.config.mjs");
const source = readFileSync(eslintConfigPath, "utf8");

describe("eslint.config.mjs contract (replaces .eslintrc.json / .eslintignore)", () => {
  it("uses the official Next.js 16 flat-config presets for core-web-vitals and typescript", () => {
    expect(source).toContain('import nextVitals from "eslint-config-next/core-web-vitals";');
    expect(source).toContain('import nextTs from "eslint-config-next/typescript";');
    expect(source).toContain("...nextVitals");
    expect(source).toContain("...nextTs");
  });

  it("builds the config via defineConfig from eslint/config and exports it as the default", () => {
    expect(source).toContain('import { defineConfig, globalIgnores } from "eslint/config";');
    expect(source).toContain("export default defineConfig([");
  });

  it("ignores build output, dependencies, coverage, and the toolchain-generated next-env.d.ts", () => {
    expect(source).toContain(
      'globalIgnores([".next/**", "node_modules/**", "out/**", "coverage/**", "next-env.d.ts"])',
    );
  });
});

describe("legacy ESLint config files are fully retired", () => {
  it("no longer ships a .eslintrc.json (superseded by eslint.config.mjs flat config)", () => {
    expect(existsSync(resolve(process.cwd(), ".eslintrc.json"))).toBe(false);
  });

  it("no longer ships a .eslintignore (ignores now live inside eslint.config.mjs)", () => {
    expect(existsSync(resolve(process.cwd(), ".eslintignore"))).toBe(false);
  });

  it("ships exactly one ESLint flat config file at the repository root", () => {
    expect(existsSync(eslintConfigPath)).toBe(true);
  });
});
