"use client";

import type { CSSProperties, ReactNode } from "react";
import { colors, radii, spacing, typography } from "./tokens";

export type ButtonVariant = "primary" | "ghost" | "soft";
export type ButtonSize = "sm" | "md";

export interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  /** Auswahlzustand für Toggle-Schaltflächen (z. B. Objektliste im Editor) */
  ariaPressed?: boolean;
}

/**
 * Button — zurückhaltendes Werkzeug-Element im Lehrertisch-Stil.
 * Primärvariante nutzt den warmen Markenakzent sparsam.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  onClick,
  className,
  style,
  ariaLabel,
  ariaPressed,
}: ButtonProps) {
  const padY = size === "sm" ? spacing[1] : spacing[2];
  const padX = size === "sm" ? spacing[3] : spacing[4];
  const fontScale = size === "sm" ? typography.scale.sm : typography.scale.md;

  const base: CSSProperties = {
    fontFamily: typography.fontFamilySans,
    fontSize: fontScale.fontSize,
    lineHeight: fontScale.lineHeight,
    fontWeight: typography.weight.medium,
    padding: `${padY}px ${padX}px`,
    borderRadius: radii.md,
    border: `1px solid ${colors.line}`,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    transition: "background-color 120ms ease",
  };

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: colors.accent,
      color: colors.markenInk,
      borderColor: colors.accent,
    },
    soft: {
      background: colors.accentSoft,
      color: colors.accentInk,
      borderColor: colors.accentSoft,
    },
    ghost: {
      background: "transparent",
      color: colors.ink,
      borderColor: colors.line,
    },
  };

  return (
    <button
      type={type}
      className={className}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

export default Button;