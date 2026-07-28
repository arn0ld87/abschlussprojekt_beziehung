import type { CSSProperties } from "react";
import { Button } from "../../src/ui/Button";
import { Container } from "../../src/ui/Container";
import { Header } from "../../src/ui/Header";
import { Markierung } from "../../src/ui/Markierung";
import { colors, spacing, typography } from "../../src/ui/tokens";

const pageStyle: CSSProperties = {
  background: colors.paper,
  color: colors.ink,
  fontFamily: typography.fontFamilySans,
  margin: 0,
  minHeight: "100vh",
};

const heroStyle: CSSProperties = {
  padding: `${spacing[5]}px ${spacing[4]}px ${spacing[2]}px`,
  maxWidth: 960,
  margin: "0 auto",
};

const gridStyle: CSSProperties = {
  padding: `${spacing[2]}px ${spacing[4]}px ${spacing[6]}px`,
  maxWidth: 960,
  margin: "0 auto",
  display: "grid",
  gap: `${spacing[4]}px`,
};

const markenRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: `${spacing[2]}px`,
  alignItems: "center",
};

const swatchRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: `${spacing[2]}px`,
  marginTop: spacing[3],
};

const swatchBase: CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: 8,
  border: `1px solid ${colors.line}`,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding: spacing[1],
  fontSize: typography.scale.xs.fontSize,
  color: colors.inkMuted,
};

const blockTitleStyle: CSSProperties = {
  fontFamily: typography.fontFamilySerif,
  fontSize: typography.scale.lg.fontSize,
  fontWeight: typography.weight.semibold,
  margin: `0 0 ${spacing[2]}px`,
};

const paraStyle: CSSProperties = {
  fontSize: typography.scale.md.fontSize,
  lineHeight: typography.scale.md.lineHeight,
  color: colors.inkMuted,
  margin: `0 0 ${spacing[3]}px`,
  maxWidth: "60ch",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: `${spacing[2]}px`,
  alignItems: "center",
};

/**
 * Design-Playground für M0-Slice #21. Rendert Tokens und alle vier
 * Basis-Komponenten (Container, Button, Header, Markierung) in einem
 * sichtbaren, hellen Layout ohne externe Bilddateien.
 *
 * rein visuell — kein Datenbank- oder KI-Provider-Zugriff.
 */
export default function DesignPlayground() {
  const fantasieSchueler = [
    { initialen: "AB", index: 0 },
    { initialen: "CD", index: 1 },
    { initialen: "EF", index: 2 },
    { initialen: "GH", index: 3 },
    { initialen: "IJ", index: 4 },
    { initialen: "KL", index: 5 },
    { initialen: "MN", index: 6 },
    { initialen: "OP", index: 7 },
  ];

  return (
    <main style={pageStyle}>
      <Header
        title="Sitzplan — Designsystem"
        klasse="7a"
        speicherstatus="Fantasiedaten"
        right={<Button variant="soft" size="sm">KI-Assistent</Button>}
      />

      <div style={heroStyle}>
        <p style={paraStyle}>
          Warme, ruhige und helle Oberfläche im Stil eines Klassenateliers /
          digitalen Lehrertischs. Freundliche Initialen- und Farbmarkierungen,
          zurückhaltende Werkzeuge, klare Kopfzeile. Kein dunkler CAD- oder
          KI-Dashboard-Look.
        </p>
      </div>

      <div style={gridStyle}>
        <Container label="Markierungen" as="section">
          <h2 style={blockTitleStyle}>Initialen- und Farbmarkierungen</h2>
          <p style={paraStyle}>
            Index-stabile, sanfte Farben. Dieselbe Person erhält immer dieselbe
            Marke — freundlich, nicht grell.
          </p>
          <div style={markenRowStyle}>
            {fantasieSchueler.map((s) => (
              <Markierung key={s.index} initialen={s.initialen} index={s.index} />
            ))}
          </div>
        </Container>

        <Container label="Werkzeuge" as="section" surface="muted">
          <h2 style={blockTitleStyle}>Werkzeuge am Rand</h2>
          <p style={paraStyle}>
            Zurückhaltende Werkzeug-Buttons. Primärakzent sparsam, Ghost und
            Soft als ruhige Alternativen.
          </p>
          <div style={buttonRowStyle}>
            <Button variant="primary">Plan speichern</Button>
            <Button variant="soft">Vorschlag übernehmen</Button>
            <Button variant="ghost">Abbrechen</Button>
            <Button variant="primary" size="sm">Neu</Button>
            <Button variant="ghost" size="sm" disabled>Kein Zugriff</Button>
          </div>
        </Container>

        <Container label="Farbtokens" as="section">
          <h2 style={blockTitleStyle}>Farbtokens</h2>
          <p style={paraStyle}>
            Zentrale Token-Werte aus <code>src/ui/tokens.ts</code> als
            sichtbare Farbfelder.
          </p>
          <div style={swatchRowStyle}>
            <div style={{ ...swatchBase, background: colors.paper }}>paper</div>
            <div style={{ ...swatchBase, background: colors.paperMuted }}>muted</div>
            <div style={{ ...swatchBase, background: colors.accent, color: colors.paper }}>accent</div>
            <div style={{ ...swatchBase, background: colors.accentSoft }}>soft</div>
            <div style={{ ...swatchBase, background: colors.ink, color: colors.paper }}>ink</div>
            <div style={{ ...swatchBase, background: colors.line }}>line</div>
          </div>
        </Container>
      </div>
    </main>
  );
}