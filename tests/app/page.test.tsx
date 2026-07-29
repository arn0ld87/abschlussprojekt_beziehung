import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "../../app/page";

describe("HomePage (app/page.tsx)", () => {
  it("renders a single <main> element as the root node", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html.startsWith("<main")).toBe(true);
    expect(html.endsWith("</main>")).toBe(true);
  });

  it("renders the M0 foundation heading", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain("<h1>Abschlussprojekt Beziehung — M0 Foundation</h1>");
  });

  it("advertises the Next.js 16 stack instead of the retired Next.js 14 line", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain("Stack: Next.js 16 (App Router) + TypeScript strict + Vitest.");
    expect(html).not.toContain("Next.js 14");
  });

  it("points to the M1 Klassen milestone instead of the retired M3 Domain Contracts one", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain("Nächster Meilenstein: M1 Klassen (Issue #3).");
    expect(html).not.toContain("M3 — Domain Contracts");
    expect(html).not.toContain("Issue #20");
  });

  it("documents the src/domain, src/services, and src/infrastructure module boundaries", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain("<code>src/domain</code>");
    expect(html).toContain("<code>src/services</code>");
    expect(html).toContain("<code>src/infrastructure</code>");
  });

  it("is a plain function component with no props", () => {
    expect(typeof HomePage).toBe("function");
    expect(HomePage.length).toBe(0);
  });
});
