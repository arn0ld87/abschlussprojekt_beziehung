import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const envExamplePath = resolve(process.cwd(), ".env.example");
const gitignorePath = resolve(process.cwd(), ".gitignore");

describe(".env.example contract (M0 #20 docker compose env wiring)", () => {
  it("exists at the repository root", () => {
    expect(existsSync(envExamplePath)).toBe(true);
  });

  it("declares every required variable without embedding secret values", () => {
    const content = readFileSync(envExamplePath, "utf8");
    const keys = new Set<string>();
    for (const line of content.split("\n")) {
      const match = /^([A-Z][A-Z0-9_]*)=/.exec(line);
      if (match) keys.add(match[1]!);
    }
    expect(keys.has("DATABASE_URL")).toBe(true);
    expect(keys.has("POSTGRES_USER")).toBe(true);
    expect(keys.has("POSTGRES_PASSWORD")).toBe(true);
    expect(keys.has("POSTGRES_DB")).toBe(true);
    expect(keys.has("PORT")).toBe(true);
  });

  it("declares every variable without any value (AC #4: no values set)", () => {
    const content = readFileSync(envExamplePath, "utf8");
    const seen = new Set<string>();
    for (const line of content.split("\n")) {
      const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
      if (!match) continue;
      const key = match[1]!;
      const value = match[2]!.trim();
      seen.add(key);
      expect(value).toBe("");
    }
    for (const required of ["DATABASE_URL", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB", "PORT"]) {
      expect(seen.has(required)).toBe(true);
    }
  });
});

describe(".gitignore contract (M0 #20 keeps .env out of version control)", () => {
  it("lists .env as ignored", () => {
    const content = readFileSync(gitignorePath, "utf8");
    expect(content).toMatch(/(^|\n)\.env(\n|$)/);
  });

  it("does not ignore .env.example (the template must remain tracked)", () => {
    const content = readFileSync(gitignorePath, "utf8");
    expect(content).not.toMatch(/(^|\n)\.env\.example(\n|$)/);
  });
});