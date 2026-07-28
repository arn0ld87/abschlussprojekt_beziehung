import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), "utf8");
}

describe("docs/STATUS.md reflects the M0 #27 foundation baseline", () => {
  const status = read("docs/STATUS.md");
  const notYetSection = status.split("## Noch nicht vorhanden")[1]?.split(/\n## /)[0] ?? "";

  it("no longer lists the Next.js application as missing", () => {
    expect(notYetSection).not.toContain("Next.js-Anwendung");
  });

  it("no longer lists automated product tests as missing", () => {
    expect(notYetSection).not.toContain("automatisierte Produkt-Tests");
  });

  it("still lists the database schema/migrations, Docker runtime, and release artifact as missing", () => {
    expect(notYetSection).toContain("Datenbankschema und Migrationen");
    expect(notYetSection).toContain("Docker-Laufzeit");
    expect(notYetSection).toContain("Release-Artefakt");
  });

  it("keeps exactly three remaining 'Noch nicht vorhanden' bullets", () => {
    const bullets = notYetSection.split("\n").filter((line) => line.trim().startsWith("-"));
    expect(bullets).toHaveLength(3);
  });
});

describe("README.md documents the active M0 #27 gates", () => {
  const readme = read("README.md");

  it("marks lint, typecheck, and vitest gates as active (M0 #27) instead of pending on M0 #19", () => {
    expect(readme).toContain("| Lint | `bun run lint` | aktiv (M0 #27) |");
    expect(readme).toContain("| Typecheck | `bun run typecheck` | aktiv (M0 #27) |");
    expect(readme).toContain("| Vitest | `bun run test` | aktiv (M0 #27) |");
    expect(readme).not.toContain("nach M0 #19");
  });

  it("replaces the retired E2E gate row with an active Build gate row", () => {
    const gatesSection = readme.split("### Qualitäts-Gates")[1]?.split(/\n##/)[0] ?? "";
    expect(gatesSection).toContain("| Build | `bun run build` | aktiv (M0 #27) |");
    expect(gatesSection).not.toContain("test:e2e");
  });

  it("references issue #27 as the foundation baseline that syncs docs and activates the gates", () => {
    expect(readme).toContain("abschlussprojekt_beziehung/issues/27");
    expect(readme).toContain("Foundation-Baseline");
  });

  it("no longer claims the app only exists after slices #18-#20 complete", () => {
    expect(readme).not.toContain(
      "Die lauffähige Anwendung entsteht erst nach Abschluss der M0-Slices",
    );
    expect(readme).not.toContain(
      "Bis dahin sind ausschließlich die dokumentarischen und Diffs-Gates aktiv.",
    );
  });

  it("still links issues #18 (scaffold), #19 (CI), and #20 (Docker/healthcheck)", () => {
    expect(readme).toContain("abschlussprojekt_beziehung/issues/18");
    expect(readme).toContain("abschlussprojekt_beziehung/issues/19");
    expect(readme).toContain("abschlussprojekt_beziehung/issues/20");
  });
});

describe("AGENTS.md permits the M0 #27 application gates", () => {
  const agents = read("AGENTS.md");

  it("no longer instructs workers to treat the app as nonexistent or invent commands", () => {
    expect(agents).not.toContain(
      "Das Repository enthält derzeit noch keine ausführbare Anwendung.",
    );
  });

  it("tells workers the build/test/lint/run scripts exist since M0 #27", () => {
    expect(agents).toContain(
      "Die ausführbaren Build-, Test-, Lint- und Run-Skripte sind seit M0-Slice #27 im Repository vorhanden.",
    );
  });

  it("references the checked-in bun run lint/typecheck/test/build gate commands", () => {
    expect(agents).toContain("`bun run lint`");
    expect(agents).toContain("`bun run typecheck`");
    expect(agents).toContain("`bun run test`");
    expect(agents).toContain("`bun run build`");
  });

  it("no longer references the removed test:e2e script in the gates line", () => {
    expect(agents).not.toContain("test:e2e");
  });

  it("keeps the documentation gate and git diff --check instructions", () => {
    expect(agents).toContain("bash scripts/check-docs.sh");
    expect(agents).toContain("git diff --check");
  });

  it("reserves E2E gates for milestone M7", () => {
    expect(agents).toContain("E2E-Gates sind M7 vorbehalten.");
  });
});

describe("CLAUDE.md lists the executable M0 #27 command set", () => {
  const claude = read("CLAUDE.md");

  it("documents lint, typecheck, test, build, and dev as concrete bun scripts", () => {
    expect(claude).toContain("Lint: `bun run lint`");
    expect(claude).toContain("Typecheck: `bun run typecheck`");
    expect(claude).toContain("Tests: `bun run test`");
    expect(claude).toContain("Build: `bun run build`");
    expect(claude).toContain("App starten: `bun run dev`");
  });

  it("no longer claims there are no executable scripts", () => {
    expect(claude).not.toContain(
      "Aktuell gibt es keine ausführbaren Build-, Test-, Lint- oder Run-Skripte.",
    );
    expect(claude).not.toContain("Erfinde keine Befehle.");
  });

  it("keeps the base check and the newly added documentation gate command", () => {
    expect(claude).toContain("Basisprüfung: `git diff --check`");
    expect(claude).toContain("Dokumentationsgate: `bash scripts/check-docs.sh`");
  });
});
