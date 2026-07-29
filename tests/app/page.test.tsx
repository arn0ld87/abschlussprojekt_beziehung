import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "../../app/page";

describe("HomePage (app/page.tsx)", () => {
  it("renders a single <main> element as the root node", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html.startsWith("<main ")).toBe(true);
    expect(html.endsWith("</main>")).toBe(true);
  });

  it("renders the M0 foundation heading", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain("<h1>Abschlussprojekt Beziehung — Dev-Übersicht</h1>");
  });

  it("documents the app/ folder", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain("<code>app/</code>");
  });

  it("is a plain function component with no props", () => {
    expect(typeof HomePage).toBe("function");
    expect(HomePage.length).toBe(0);
  });
});
