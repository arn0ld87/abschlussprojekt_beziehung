import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "../../app/page";

describe("HomePage (app/page.tsx)", () => {
  it("renders a single <main> element as the root node", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html.startsWith("<main")).toBe(true);
    expect(html.endsWith("</main>")).toBe(true);
  });

  it("renders the dev overview heading", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain("<h1>Abschlussprojekt Beziehung — Dev-Übersicht</h1>");
  });

  it("documents the dynamic route navigation helper text", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain("Dev-Helper (Throwaway). Dynamische Routes wie <code>/klassen/[id]</code>");
  });

  it("is a plain function component with no props", () => {
    expect(typeof HomePage).toBe("function");
    expect(HomePage.length).toBe(0);
  });
});
