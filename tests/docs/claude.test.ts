import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const claude = readFileSync(resolve(process.cwd(), "CLAUDE.md"), "utf8");

describe("CLAUDE.md", () => {
  it("lists the concrete lint/typecheck/test/build/dev commands", () => {
    expect(claude).toContain("Lint: `bun run lint`");
    expect(claude).toContain("Typecheck: `bun run typecheck`");
    expect(claude).toContain("Tests: `bun run test`");
    expect(claude).toContain("Build: `bun run build`");
    expect(claude).toContain("App starten: `bun run dev`");
  });

  it("documents the docs gate and diff-check commands", () => {
    expect(claude).toContain("Basisprüfung: `git diff --check`");
    expect(claude).toContain("Dokumentationsgate: `bash scripts/check-docs.sh`");
  });

  it("no longer claims that no executable scripts exist", () => {
    expect(claude).not.toContain("Erfinde keine Befehle.");
    expect(claude).not.toContain(
      "Aktuell gibt es keine ausführbaren Build-, Test-, Lint- oder Run-Skripte.",
    );
  });

  it("keeps the graph-update and review commands referenced elsewhere in the workflow", () => {
    expect(claude).toContain(
      "Graph nach Änderungen: `code-review-graph update --base HEAD --repo . --brief`",
    );
    expect(claude).toContain("Lokaler Abschlussreview: `cr review --type uncommitted`");
  });
});
