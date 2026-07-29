import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { users, sessions, accounts, verifications } from "../../src/infrastructure/db/schema";
import { getDb } from "../../src/infrastructure/db/client";
import drizzleConfig from "../../drizzle.config";

describe("Database Infrastructure & Migrations (M1 #42)", () => {
  it("has drizzle.config.ts configured with postgresql and ./drizzle output", () => {
    expect(drizzleConfig.schema).toBe("./src/infrastructure/db/schema.ts");
    expect(drizzleConfig.out).toBe("./drizzle");
    expect(drizzleConfig.dialect).toBe("postgresql");
  });

  it("has 0001_init_auth.sql migration creating users, sessions, accounts, and verifications tables", () => {
    const sqlPath = resolve(__dirname, "../../drizzle/0001_init_auth.sql");
    expect(existsSync(sqlPath)).toBe(true);

    const sqlContent = readFileSync(sqlPath, "utf-8");
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS "users"');
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS "sessions"');
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS "accounts"');
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS "verifications"');
    expect(sqlContent).toContain('"email" TEXT NOT NULL UNIQUE');
    expect(sqlContent).toContain('"password_hash" TEXT NOT NULL');
    expect(sqlContent).toContain('REFERENCES "users"');
  });

  it("defines users, sessions, accounts, and verifications tables in Drizzle schema", () => {
    expect(users).toBeDefined();
    expect(sessions).toBeDefined();
    expect(accounts).toBeDefined();
    expect(verifications).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.passwordHash).toBeDefined();
    expect(sessions.userId).toBeDefined();
    expect(sessions.expiresAt).toBeDefined();
    expect(accounts.userId).toBeDefined();
    expect(verifications.identifier).toBeDefined();
  });

  it("exports getDb client function", () => {
    expect(typeof getDb).toBe("function");
  });
});
