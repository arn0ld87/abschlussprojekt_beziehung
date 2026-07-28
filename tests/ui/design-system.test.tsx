import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "../../src/ui/Button";
import { Container } from "../../src/ui/Container";
import { Header } from "../../src/ui/Header";
import { Markierung } from "../../src/ui/Markierung";
import { colors, markeFor, marken, radii, spacing, typography } from "../../src/ui/tokens";
const { markenInk } = colors;
import DesignPlayground from "../../app/design/page";

describe("Design tokens (src/ui/tokens.ts)", () => {
  it("declares warm light paper and warm ink tones, no dark dashboard look", () => {
    expect(colors.paper).toMatch(/^#FBF7F0/i);
    expect(colors.ink).toMatch(/^#2A2622/i);
    // Akzent ist warmes Terrakotta, kein grelles Dashboard-Blau.
    expect(colors.accent).toMatch(/^#C26B3C/i);
  });

  it("declares a friendly, index-stable marken palette for initial markings", () => {
    expect(marken.length).toBeGreaterThanOrEqual(6);
    expect(markeFor(0)).toBe(marken[0]);
    expect(markeFor(marken.length)).toBe(marken[0]);
    expect(markeFor(3)).toBe(marken[3]);
  });

  it("markeFor handles non-finite and fractional indices safely", () => {
    expect(markeFor(Number.NaN)).toBe(marken[0]);
    expect(markeFor(Number.POSITIVE_INFINITY)).toBe(marken[0]);
    expect(markeFor(2.9)).toBe(markeFor(2));
  });

  it("declares typography, spacing and radii scales", () => {
    expect(typography.fontFamilySans.length).toBeGreaterThan(0);
    expect(typography.fontFamilySerif.length).toBeGreaterThan(0);
    expect(Object.keys(spacing).length).toBeGreaterThanOrEqual(5);
    expect(radii.lg).toBeGreaterThan(radii.sm);
  });
});

describe("Container", () => {
  it("is a function component", () => {
    expect(typeof Container).toBe("function");
  });

  it("renders a div with paper background, border and children", () => {
    const html = renderToStaticMarkup(
      <Container label="Werkzeuge">Inhalt</Container>,
    );
    expect(html.startsWith("<div")).toBe(true);
    expect(html).toContain("Inhalt");
    expect(html).toContain(colors.paper);
    expect(html).toContain(colors.line);
    expect(html).toContain("border-radius");
  });

  it("supports the muted surface variant", () => {
    const html = renderToStaticMarkup(
      <Container surface="muted">Rand</Container>,
    );
    expect(html).toContain(colors.paperMuted);
  });

  it("can render as a semantic section element", () => {
    const html = renderToStaticMarkup(
      <Container as="section">Abschnitt</Container>,
    );
    expect(html.startsWith("<section")).toBe(true);
  });
});

describe("Button", () => {
  it("is a function component", () => {
    expect(typeof Button).toBe("function");
  });

  it("renders a button element with type=button by default", () => {
    const html = renderToStaticMarkup(<Button>Klick</Button>);
    expect(html.startsWith("<button")).toBe(true);
    expect(html).toContain('type="button"');
    expect(html).toContain("Klick");
  });

  it("primary variant uses the warm accent color with AA-contrast foreground", () => {
    const html = renderToStaticMarkup(<Button variant="primary">Plan</Button>);
    expect(html).toContain(colors.accent);
    // markenInk (#15110D) auf accent (#C26B3C) ≈ 4.89:1 — WCAG-AA.
    expect(html).toContain(markenInk);
  });

  it("ghost variant stays restrained (transparent background, line border)", () => {
    const html = renderToStaticMarkup(<Button variant="ghost">Abbrechen</Button>);
    expect(html).toContain("transparent");
    expect(html).toContain(colors.line);
  });

  it("marks the button as disabled", () => {
    const html = renderToStaticMarkup(
      <Button disabled>Kein Klick</Button>,
    );
    expect(html).toContain('disabled=""');
  });
});

describe("Header", () => {
  it("is a function component", () => {
    expect(typeof Header).toBe("function");
  });

  it("renders a header element with title, klasse and speicherstatus", () => {
    const html = renderToStaticMarkup(
      <Header title="Sitzplan" klasse="7a" speicherstatus="Gespeichert" />,
    );
    expect(html.startsWith("<header")).toBe(true);
    expect(html).toContain(">Sitzplan</h1>");
    expect(html).toContain("7a");
    expect(html).toContain("Gespeichert");
    expect(html).toContain('aria-label="Speicherstatus: Gespeichert"');
  });

  it("uses the serif display font for the title", () => {
    const html = renderToStaticMarkup(<Header title="Atelier" />);
    expect(html).toContain("Georgia");
  });

  it("renders the right tool slot when provided", () => {
    const html = renderToStaticMarkup(
      <Header title="Plan" right={<button>Assistent</button>} />,
    );
    expect(html).toContain("Assistent");
  });
});

describe("Markierung", () => {
  it("is a function component", () => {
    expect(typeof Markierung).toBe("function");
  });

  it("renders uppercase initials on a colored, pill-shaped mark", () => {
    const html = renderToStaticMarkup(
      <Markierung initialen="ab" index={0} />,
    );
    expect(html.startsWith("<span")).toBe(true);
    expect(html).toContain(">AB<");
    expect(html).toContain(marken[0]);
    // Pill-Radius wird als 999px inline gerendert.
    expect(html).toContain(`${radii.pill}px`);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Markierung AB"');
    // markenInk auf allen Marken ≥ 7.0:1 — WCAG-AA.
    expect(html).toContain(markenInk);
  });

  it("truncates initials longer than three characters", () => {
    const html = renderToStaticMarkup(
      <Markierung initialen="Lange" index={1} />,
    );
    expect(html).toContain(">LAN<");
  });

  it("uses the index-stable mark color from the palette", () => {
    const a = renderToStaticMarkup(<Markierung initialen="A" index={2} />);
    const b = renderToStaticMarkup(<Markierung initialen="A" index={2} />);
    expect(a).toContain(marken[2]);
    expect(a).toBe(b);
  });
});

describe("Design playground (app/design/page.tsx)", () => {
  it("is a function component with no props", () => {
    expect(typeof DesignPlayground).toBe("function");
    expect(DesignPlayground.length).toBe(0);
  });

  it("renders Container, Button, Header and Markierung in a single root", () => {
    const html = renderToStaticMarkup(<DesignPlayground />);
    // Header
    expect(html).toContain("<header");
    // Container (section)
    expect(html).toContain("<section");
    // Button
    expect(html).toContain("<button");
    // Markierung (span mit role=img)
    expect(html).toContain('role="img"');
    // Keine externen Bildreferenzen.
    expect(html).not.toMatch(/src="[^"]*\.(png|jpg|jpeg|svg|webp)"/i);
    // Helle Papierfläche als Hintergrund.
    expect(html).toContain(colors.paper);
  });
});