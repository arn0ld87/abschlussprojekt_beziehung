import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const dependabotPath = resolve(process.cwd(), ".github/dependabot.yml");
const dependabotText = readFileSync(dependabotPath, "utf8");
const dependabot = parse(dependabotText) as {
  version: number;
  updates: {
    "package-ecosystem": string;
    directory: string;
    schedule: { interval: string };
    groups?: Record<string, { "dependency-type"?: string }>;
  }[];
};

describe("dependabot contract (M0 #31 dependency update mechanism)", () => {
  it("is a version 2 dependabot configuration", () => {
    expect(dependabot.version).toBe(2);
    expect(Array.isArray(dependabot.updates)).toBe(true);
    expect(dependabot.updates.length).toBeGreaterThan(0);
  });

  it("watches the bun ecosystem at the repository root on a weekly interval", () => {
    const bun = dependabot.updates.find(
      (update) => update["package-ecosystem"] === "bun" && update.directory === "/",
    );
    expect(bun, "a bun ecosystem entry for '/' is required").toBeDefined();
    expect(bun!.schedule.interval).toBe("weekly");
  });

  it("groups development dependencies into a single update PR", () => {
    const bun = dependabot.updates.find((update) => update["package-ecosystem"] === "bun");
    const groups = bun!.groups ?? {};
    const devGroup = Object.values(groups).find(
      (group) => group["dependency-type"] === "development",
    );
    expect(devGroup, "a group covering dependency-type development is required").toBeDefined();
  });

  it("contains no credentials, tokens or registry secrets", () => {
    const lowered = dependabotText.toLowerCase();
    expect(lowered).not.toContain("token");
    expect(lowered).not.toContain("password");
    expect(lowered).not.toContain("secret");
    expect(dependabot).not.toHaveProperty("registries");
  });
});
