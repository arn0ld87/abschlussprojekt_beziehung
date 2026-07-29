import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const status = readFileSync(resolve(process.cwd(), "docs/STATUS.md"), "utf8");
const notYetSection = status.split("## Noch nicht vorhanden")[1]?.split(/\n## /)[0] ?? "";

describe("docs/STATUS.md", () => {
  it("has a non-empty 'Noch nicht vorhanden' section to assert against", () => {
    expect(notYetSection.trim().length).toBeGreaterThan(0);
  });

  it("no longer lists the Next.js application as missing (shipped in M0 #18/#27)", () => {
    expect(notYetSection).not.toContain("Next.js-Anwendung");
  });

  it("no longer lists automated product tests as missing (shipped in M0 #27)", () => {
    expect(notYetSection).not.toContain("automatisierte Produkt-Tests");
  });

  it("no longer lists database schema as missing (shipped in M1 #42/#43)", () => {
    expect(notYetSection).not.toContain("Datenbankschema und Migrationen");
  });

  it("still lists the remaining M1 work and release artifact as not yet present", () => {
    expect(notYetSection).toContain("Release-Artefakt");
    expect(notYetSection).not.toContain("Docker-Laufzeit");
  });
});
