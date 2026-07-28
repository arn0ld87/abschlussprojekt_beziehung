/**
 * Zentrale Design-Tokens für das Sitzplan-Designsystem.
 *
 * Single Source of Truth für Farben, Typografie, Spacing und Radii.
 * Ausgerichtet an §6 docs/product.md: warmer, ruhiger, heller „Klassenatelier /
 * Digitaler Lehrertisch"-Stil mit freundlichen Initialen- und Farbmarkierungen.
 * Kein dunkler CAD- oder KI-Dashboard-Look, keine generische Dashboard-Optik.
 *
 * Komponenten in `src/ui/` importieren ausschließlich von hier. Hartkodierte
 * Werte in Komponenten sind verboten.
 */

export const colors = {
  /** Warmes Elfenbein — Hauptgrundfläche, hell und ruhig. */
  paper: "#FBF7F0",
  /** Gedämpfter Papierton für Flächen am Rand (Werkzeuge, Schülerablage). */
  paperMuted: "#F3ECE0",
  /** Warme Tinte — Haupttextfarbe, weiches Tiefbraun statt reinem Schwarz. */
  ink: "#2A2622",
  /** Gedämpfte Tinte für sekundären Text. */
  inkMuted: "#6B6258",
  /** Warme Trennlinie. */
  line: "#E4DBC9",
  /** Markenakzent — warmes Terrakotta, sparsam eingesetzt. */
  accent: "#C26B3C",
  /** Weicher Akzenthintergrund. */
  accentSoft: "#F0DBC4",
  /** Akzenttext auf hellem Grund. */
  accentInk: "#8A4520",
  /**
   * Dunkler, warmer Foreground für Initialien auf den mittelhellen Marken und
   * für Text auf dem Akzent. WCAG-AA (≥4.5:1) auf allen Marken (min 7.0:1)
   * und auf `accent` (4.89:1) verifiziert. `paper` erreichte auf den Marken
   * nur ≈1.8–2.5:1 und auf `accent` 3.6:1 — unlesbar.
   */
  markenInk: "#15110D",
} as const;

/**
 * Freundliche Initialen- und Farbmarkierungen (§6).
 * Sanfte, pigmentierte Töne — keine grellen Dashboard-Farben.
 * Index-stabil: eine Klasse/ein Schüler erhält eine wiederkehrende Farbe.
 */
export const marken = [
  "#E08A6B", // warmes Pfirsich
  "#9DBFA8", // Salbei
  "#E3B56B", // warmes Senfgelb
  "#A99CCB", // sanftes Lavendel
  "#7CA9C2", // sanftes Blau
  "#D88BA0", // sanftes Rosa
  "#B89970", // warmes Sand
  "#82B7A5", // warmes Eukalyptus
] as const;

export const typography = {
  /** UI-Schrift — systemnah, ruhig. */
  fontFamilySans:
    "IBM Plex Sans, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  /** Atelier-Display — serifenbetont für Titel und Kopfzeile. */
  fontFamilySerif: "Georgia, 'Times New Roman', serif",
  fontFamilyMono:
    "IBM Plex Mono, ui-monospace, 'SFMono-Regular', Menlo, monospace",
  scale: {
    xs: { fontSize: "0.75rem", lineHeight: "1.1rem" },
    sm: { fontSize: "0.875rem", lineHeight: "1.25rem" },
    md: { fontSize: "1rem", lineHeight: "1.5rem" },
    lg: { fontSize: "1.25rem", lineHeight: "1.65rem" },
    xl: { fontSize: "1.6rem", lineHeight: "2rem" },
    xxl: { fontSize: "2.1rem", lineHeight: "2.6rem" },
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
  },
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
} as const;

export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

/**
 * CSS-Variablen-Spiegel der Tokens. Optional nutzbar; die Single Source of
 * Truth bleiben die typisierten TS-Tokens oben.
 */
export const cssVariables: Record<string, string> = {
  "--color-paper": colors.paper,
  "--color-paper-muted": colors.paperMuted,
  "--color-ink": colors.ink,
  "--color-ink-muted": colors.inkMuted,
  "--color-line": colors.line,
  "--color-accent": colors.accent,
  "--color-accent-soft": colors.accentSoft,
  "--color-accent-ink": colors.accentInk,
  "--color-marken-ink": colors.markenInk,
  "--font-sans": typography.fontFamilySans,
  "--font-serif": typography.fontFamilySerif,
  "--font-mono": typography.fontFamilyMono,
};

/** Liefert eine stabile Markenfarbe für einen gegebenen Index. */
export function markeFor(index: number): string {
  if (!Number.isFinite(index)) {
    return marken[0]!;
  }
  const truncated = Math.trunc(index);
  const i = ((truncated % marken.length) + marken.length) % marken.length;
  return marken[i]!;
}

export type DesignTokens = {
  colors: typeof colors;
  marken: typeof marken;
  typography: typeof typography;
  spacing: typeof spacing;
  radii: typeof radii;
};

export const tokens: DesignTokens = {
  colors,
  marken,
  typography,
  spacing,
  radii,
};