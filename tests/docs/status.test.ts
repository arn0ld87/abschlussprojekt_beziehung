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

  it("still lists the remaining outstanding foundation work (Docker runtime shipped in M0 #20/#31)", () => {
    expect(notYetSection).toContain("Datenbankschema und Migrationen");
    expect(notYetSection).toContain("Release-Artefakt");
    expect(notYetSection).not.toContain("Docker-Laufzeit");
  });
});
