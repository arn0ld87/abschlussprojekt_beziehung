import type { CSSProperties, ReactNode } from "react";
import { colors, radii, spacing, typography } from "./tokens";

export interface HeaderProps {
  title: string;
  /** Klartext-Kürzel oder Klassenname in der Kopfzeile (§6). */
  klasse?: string;
  /** Speicherstatus-Text (z. B. „Gespeichert"). */
  speicherstatus?: string;
  /** Rechtes Werkzeugfach (z. B. KI-Assistent-Auslöser). */
  right?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Header — klare Kopfzeile mit Klasse, Speicherstatus und Werkzeugfach.
 * Rein visuell; kein direkter Datenbank- oder KI-Zugriff.
 */
export function Header({
  title,
  klasse,
  speicherstatus,
  right,
  className,
  style,
}: HeaderProps) {
  const ownStyle: CSSProperties = {
    background: colors.paper,
    borderBottom: `1px solid ${colors.line}`,
    padding: `${spacing[3]}px ${spacing[4]}px`,
    display: "flex",
    alignItems: "center",
    gap: `${spacing[3]}px`,
    fontFamily: typography.fontFamilySans,
    color: colors.ink,
    boxSizing: "border-box",
  };
  const titleStyle: CSSProperties = {
    fontFamily: typography.fontFamilySerif,
    fontSize: typography.scale.xl.fontSize,
    lineHeight: typography.scale.xl.lineHeight,
    fontWeight: typography.weight.semibold,
    margin: 0,
    color: colors.ink,
  };
  const metaBase: CSSProperties = {
    fontSize: typography.scale.sm.fontSize,
    lineHeight: typography.scale.sm.lineHeight,
    color: colors.inkMuted,
    padding: `${spacing[1]}px ${spacing[2]}px`,
    borderRadius: radii.sm,
    border: `1px solid ${colors.line}`,
    background: colors.paperMuted,
  };
  return (
    <header className={className} style={{ ...ownStyle, ...style }}>
      <h1 style={titleStyle}>{title}</h1>
      {klasse ? <span style={metaBase}>{klasse}</span> : null}
      {speicherstatus ? (
        <span
          style={metaBase}
          aria-label={`Speicherstatus: ${speicherstatus}`}
        >
          {speicherstatus}
        </span>
      ) : null}
      {right ? <div style={{ marginLeft: "auto" }}>{right}</div> : null}
    </header>
  );
}

export default Header;