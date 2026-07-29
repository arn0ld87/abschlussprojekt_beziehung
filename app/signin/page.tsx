'use client';

import { useState } from "react";
import Container from "../../src/ui/Container";
import Button from "../../src/ui/Button";
import { colors, radii, spacing, typography } from "../../src/ui/tokens";

export default function SignInPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const endpoint = mode === "signin" ? "/api/auth/sign-in" : "/api/auth/sign-up";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error?.message || "Fehler bei der Authentifizierung.");
      }

      window.location.href = "/klassen";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unerwarteter Fehler.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.paper,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: typography.fontFamilySans,
        color: colors.ink,
      }}
    >
      <Container style={{ maxWidth: "420px", width: "100%" }}>
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: `1px solid ${colors.line}`,
            borderRadius: `${radii.lg}px`,
            padding: `${spacing[6]}px`,
            boxShadow: "0 4px 12px rgba(42, 38, 34, 0.05)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: `${spacing[4]}px` }}>
            <h1
              style={{
                fontFamily: typography.fontFamilySerif,
                fontSize: typography.scale.xxl.fontSize,
                fontWeight: typography.weight.semibold,
                margin: 0,
                color: colors.ink,
              }}
            >
              {mode === "signin" ? "Anmeldung" : "Registrierung"}
            </h1>
            <p
              style={{
                margin: `${spacing[2]}px 0 0 0`,
                fontSize: typography.scale.sm.fontSize,
                color: colors.inkMuted,
              }}
            >
              Sitzplan – Digitaler Lehrertisch
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: "flex",
              backgroundColor: colors.paperMuted,
              padding: "4px",
              borderRadius: `${radii.md}px`,
              marginBottom: `${spacing[5]}px`,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              style={{
                flex: 1,
                padding: `${spacing[2]}px`,
                border: "none",
                borderRadius: `${radii.sm}px`,
                backgroundColor: mode === "signin" ? "#FFFFFF" : "transparent",
                color: mode === "signin" ? colors.ink : colors.inkMuted,
                fontWeight: mode === "signin" ? typography.weight.semibold : typography.weight.regular,
                cursor: "pointer",
                fontSize: typography.scale.sm.fontSize,
                boxShadow: mode === "signin" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              style={{
                flex: 1,
                padding: `${spacing[2]}px`,
                border: "none",
                borderRadius: `${radii.sm}px`,
                backgroundColor: mode === "signup" ? "#FFFFFF" : "transparent",
                color: mode === "signup" ? colors.ink : colors.inkMuted,
                fontWeight: mode === "signup" ? typography.weight.semibold : typography.weight.regular,
                cursor: "pointer",
                fontSize: typography.scale.sm.fontSize,
                boxShadow: mode === "signup" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              Registrieren
            </button>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "#FEF2F2",
                border: "1px solid #FCA5A5",
                color: "#991B1B",
                padding: `${spacing[3]}px`,
                borderRadius: `${radii.md}px`,
                marginBottom: `${spacing[4]}px`,
                fontSize: typography.scale.sm.fontSize,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: `${spacing[4]}px` }}>
            <div>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: typography.scale.sm.fontSize,
                  fontWeight: typography.weight.medium,
                  marginBottom: `${spacing[1]}px`,
                  color: colors.ink,
                }}
              >
                E-Mail-Adresse
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lehrkraft@schule.de"
                style={{
                  width: "100%",
                  padding: `${spacing[2]}px ${spacing[3]}px`,
                  borderRadius: `${radii.md}px`,
                  border: `1px solid ${colors.line}`,
                  backgroundColor: colors.paper,
                  fontSize: typography.scale.md.fontSize,
                  fontFamily: typography.fontFamilySans,
                  color: colors.ink,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: typography.scale.sm.fontSize,
                  fontWeight: typography.weight.medium,
                  marginBottom: `${spacing[1]}px`,
                  color: colors.ink,
                }}
              >
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: `${spacing[2]}px ${spacing[3]}px`,
                  borderRadius: `${radii.md}px`,
                  border: `1px solid ${colors.line}`,
                  backgroundColor: colors.paper,
                  fontSize: typography.scale.md.fontSize,
                  fontFamily: typography.fontFamilySans,
                  color: colors.ink,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              style={{
                width: "100%",
                marginTop: `${spacing[2]}px`,
                justifyContent: "center",
              }}
            >
              {submitting
                ? mode === "signin"
                  ? "Anmelden..."
                  : "Registrieren..."
                : mode === "signin"
                ? "Anmelden"
                : "Neues Konto erstellen"}
            </Button>
          </form>
        </div>
      </Container>
    </div>
  );
}
