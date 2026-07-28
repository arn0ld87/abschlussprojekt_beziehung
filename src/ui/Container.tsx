import type { CSSProperties, ReactNode } from "react";
import { colors, radii, spacing, typography } from "./tokens";

export interface ContainerProps {
  children: ReactNode;
  /** Optionaler Flächenname (z. B. „Werkzeuge"), als aria-label nutzbar. */
  label?: string;
  /** Hintergrundvariante. */
  surface?: "paper" | "muted";
  /** Horizontaler Innenabstand als Spacing-Stufe. */
  padding?: keyof typeof spacing;
  /** Maximalbreite in px; null = volle Breite. */
  maxWidth?: number | null;
  /** HTML-Element-Tag (z. B. `section`, `aside`). */
  as?: "div" | "section" | "aside" | "main" | "article";
  className?: string;
  style?: CSSProperties;
}

/**
 * Container — ruhige Flächenkapsel für den „Klassenatelier"-Grundstil.
 * Greift nicht auf Datenbank oder KI-Provider; rein visuelle Hülle.
 */
export function Container({
  children,
  label,
  surface = "paper",
  padding = 4,
  maxWidth = null,
  as = "div",
  className,
  style,
}: ContainerProps) {
  const Tag = as;
  const background = surface === "muted" ? colors.paperMuted : colors.paper;
  const ownStyle: CSSProperties = {
    background,
    border: `1px solid ${colors.line}`,
    borderRadius: radii.lg,
    padding: spacing[padding],
    maxWidth: maxWidth ?? undefined,
    boxSizing: "border-box",
    fontFamily: typography.fontFamilySans,
    color: colors.ink,
  };
  // `div` ist ohne Rolle nicht nameable; bei vorhandenem Label bekommt es
  // role="group", damit aria-label semantisch greift. Semantische Tags
  // (section, aside, main, article) sind nativ nameable.
  const needsRole = label !== undefined && as === "div";
  return (
    <Tag
      className={className}
      style={{ ...ownStyle, ...style }}
      aria-label={label}
      role={needsRole ? "group" : undefined}
    >
      {children}
    </Tag>
  );
}

export default Container;