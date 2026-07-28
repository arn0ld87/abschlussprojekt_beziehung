import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const composePath = resolve(process.cwd(), "docker-compose.yml");
const composeText = readFileSync(composePath, "utf8");
const compose = parse(composeText) as {
  services: Record<string, {
    image?: string;
    build?: unknown;
    depends_on?: Record<string, { condition: string }>;
    healthcheck?: { test: string[]; interval?: string; timeout?: string; retries?: number };
    environment?: Record<string, string>;
    ports?: string[];
    volumes?: string[];
    networks?: string[];
  }>;
  networks?: Record<string, unknown>;
  volumes?: Record<string, unknown>;
};

describe("docker-compose.yml contract (M0 #20 docker compose for app and postgres)", () => {
  it("defines exactly the app and postgres services", () => {
    expect(Object.keys(compose.services ?? {}).sort()).toEqual(["app", "postgres"]);
  });

  it("declares a shared network referenced by both services", () => {
    expect(compose.networks).toBeDefined();
    const networkNames = Object.keys(compose.networks ?? {});
    expect(networkNames.length).toBeGreaterThanOrEqual(1);
    const sharedNetwork = networkNames[0]!;
    expect(compose.services.app?.networks).toContain(sharedNetwork);
    expect(compose.services.postgres?.networks).toContain(sharedNetwork);
  });

  it("declares a named volume for postgres data persistence", () => {
    expect(compose.volumes).toBeDefined();
    const volumeNames = Object.keys(compose.volumes ?? {});
    expect(volumeNames.length).toBeGreaterThanOrEqual(1);
    const postgresVolume = compose.services.postgres?.volumes?.find((v) =>
      v.startsWith(`${volumeNames[0]}:`),
    );
    expect(postgresVolume).toBeDefined();
  });

  it("starts app only after postgres reports healthy", () => {
    expect(compose.services.app?.depends_on?.postgres?.condition).toBe("service_healthy");
  });

  it("runs a real SELECT 1 as the postgres healthcheck", () => {
    const pgHealthcheck = compose.services.postgres?.healthcheck;
    expect(pgHealthcheck).toBeDefined();
    expect(pgHealthcheck?.test).toEqual(
      expect.arrayContaining([expect.stringContaining("SELECT 1")]),
    );
  });

  it("escapes postgres healthcheck variables so they expand inside the container, not via compose interpolation", () => {
    const pgTest = (compose.services.postgres?.healthcheck?.test ?? []).join(" ");
    expect(pgTest).toMatch(/\$\${POSTGRES_USER}/);
    expect(pgTest).toMatch(/\$\${POSTGRES_DB}/);
    expect(pgTest).not.toMatch(/(^|[^$])\$\{POSTGRES_USER:-[^}]+\}/);
  });

  it("configures an app healthcheck that probes the app http health endpoint", () => {
    const appHealthcheck = compose.services.app?.healthcheck;
    expect(appHealthcheck).toBeDefined();
    expect(appHealthcheck?.test).toBeDefined();
    expect(appHealthcheck?.interval).toBeDefined();
    expect(appHealthcheck?.timeout).toBeDefined();
    expect(appHealthcheck?.retries).toBeGreaterThan(0);
  });

  it("uses a bun-native fetch probe for the app healthcheck (no curl in oven/bun image)", () => {
    const testCmd = (compose.services.app?.healthcheck?.test ?? []).join(" ");
    expect(testCmd).toContain("/api/health");
    expect(testCmd).toMatch(/\bbun\b/);
    expect(testCmd).toMatch(/\bfetch\b/);
    expect(testCmd).not.toMatch(/\bcurl\b/);
  });

  it("provides compose substitution defaults so config resolves without a .env file", () => {
    const text = composeText;
    expect(text).toMatch(/\$\{POSTGRES_USER:-[^}]+\}/);
    expect(text).toMatch(/\$\{POSTGRES_PASSWORD:-[^}]+\}/);
    expect(text).toMatch(/\$\{POSTGRES_DB:-[^}]+\}/);
    expect(text).toMatch(/\$\{PORT:-[^}]+\}/);
  });

  it("exposes the app on a host port mapped to the container port", () => {
    expect(compose.services.app?.ports).toBeDefined();
    expect(compose.services.app?.ports?.length).toBeGreaterThan(0);
  });

  it("does not embed secret values in the compose file", () => {
    const appEnv = compose.services.app?.environment ?? {};
    const pgEnv = compose.services.postgres?.environment ?? {};
    const values = [...Object.values(appEnv), ...Object.values(pgEnv)].join("\n");
    expect(values).not.toMatch(/\b(password|secret|api[_-]?key)\b/i);
  });
});