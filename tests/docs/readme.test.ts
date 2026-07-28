import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");

describe("README.md", () => {
  it("marks the lint, typecheck, vitest and build gates as active since M0 #27", () => {
    expect(readme).toMatch(/\| Lint \| `bun run lint` \| aktiv \(M0 #27\) \|/);
    expect(readme).toMatch(/\| Typecheck \| `bun run typecheck` \| aktiv \(M0 #27\) \|/);
    expect(readme).toMatch(/\| Vitest \| `bun run test` \| aktiv \(M0 #27\) \|/);
    expect(readme).toMatch(/\| Build \| `bun run build` \| aktiv \(M0 #27\) \|/);
  });

  it("drops the former conditional E2E gate row", () => {
    const gatesSection = readme.split("### Qualitäts-Gates")[1]?.split(/\n##/)[0] ?? "";
    expect(gatesSection).not.toContain("test:e2e");
    expect(gatesSection).not.toMatch(/\| E2E \|/);
  });

  it("no longer claims the gates only turn active after issue #19", () => {
    expect(readme).not.toContain("| nach M0 #19 |");
  });

  it("links the Foundation-Baseline issue #27 and the Docker issue #20", () => {
    expect(readme).toContain(
      "[#27 Foundation-Baseline](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/27)",
    );
    expect(readme).toContain(
      "[#20](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/20)",
    );
  });

  it("no longer claims the app only exists after completing the M0 slices #18-#20", () => {
    expect(readme).not.toContain(
      "Die lauffähige Anwendung entsteht erst nach Abschluss der M0-Slices",
    );
  });

  it("states that the Next.js scaffold has been running since M0 slice #18", () => {
    expect(readme).toContain("Die Next.js-Scaffold läuft seit M0-Slice");
    expect(readme).toContain(
      "[#18](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/18)",
    );
  });
});
