import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const agents = readFileSync(resolve(process.cwd(), "AGENTS.md"), "utf8");

describe("AGENTS.md", () => {
  it("documents that the executable scripts exist since M0 slice #27", () => {
    expect(agents).toContain(
      "Die ausführbaren Build-, Test-, Lint- und Run-Skripte sind seit M0-Slice #27 im Repository vorhanden.",
    );
  });

  it("no longer claims that no executable application exists", () => {
    expect(agents).not.toContain(
      "Das Repository enthält derzeit noch keine ausführbare Anwendung.",
    );
    expect(agents).not.toContain("Erfinde weder Projektstruktur noch Build-, Test-, Lint-");
  });

  it("requires all four application gates to stay green and reserves E2E for M7", () => {
    expect(agents).toContain(
      "Anwendungs-Gates (`bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`) sind seit M0 #27 vorhanden und bei jedem Slice grün zu halten.",
    );
    expect(agents).toContain("E2E-Gates sind M7 vorbehalten.");
  });

  it("no longer treats the application gates as unavailable during an M0 docs-only phase", () => {
    expect(agents).not.toContain("Während der aktuellen M0-Doku-Phase nicht vorhanden");
  });
});
