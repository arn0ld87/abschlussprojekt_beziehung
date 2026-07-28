import type { CSSProperties } from "react";
import { colors, markeFor, radii, typography } from "./tokens";

export interface MarkierungProps {
  /** Initialien (1–3 Zeichen), gerendert als freundliche Farbmarkierung (§6). */
  initialen: string;
  /** Stabiler Index zur Wahl der Markenfarbe; typischerweise Schüler-ID. */
  index: number;
  /** Pixel-Durchmesser. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Markierung — freundliche Initialen- und Farbmarkierung nach §6 product.md.
 * Index-stabil: derselbe Index erhält immer dieselbe Farbe. Keine echten Namen.
 */
export function Markierung({
  initialen,
  index,
  size = 36,
  className,
  style,
}: MarkierungProps) {
  const diameter = Number.isFinite(size) && size > 0 ? size : 36;
  const bg = markeFor(index);
  const ownStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: diameter,
    height: diameter,
    borderRadius: radii.pill,
    background: bg,
    color: colors.markenInk,
    fontFamily: typography.fontFamilySans,
    fontSize: `${Math.round(diameter * 0.4)}px`,
    fontWeight: typography.weight.semibold,
    letterSpacing: "0.02em",
    userSelect: "none",
    flex: "0 0 auto",
  };
  const label =
    initialen.length > 3 ? initialen.slice(0, 3).toUpperCase() : initialen.toUpperCase();
  return (
    <span
      className={className}
      style={{ ...ownStyle, ...style }}
      aria-label={`Markierung ${label}`}
      role="img"
    >
      {label}
    </span>
  );
}

export default Markierung;