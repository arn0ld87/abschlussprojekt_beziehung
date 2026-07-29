import type { CSSProperties } from "react";
import Link from "next/link";
import { listRoutes, getMeta, type RouteStatus } from "./route-meta";

// Dev-Übersicht zur Laufzeit: scannt app/ nach page.tsx/route.ts.
// Status-Badges kommen aus route-meta.ts (Single Source of Truth);
// ein Coverage-Test stellt sicher, dass jede Route dort gepflegt ist.
export const dynamic = "force-dynamic";

const STATUS_META: Record<RouteStatus, { emoji: string; text: string; color: string }> = {
  green: { emoji: "🟢", text: "geht", color: "#15803d" },
  yellow: { emoji: "🟡", text: "Login nötig", color: "#b45309" },
  red: { emoji: "🔴", text: "geplant / fehlt", color: "#b91c1c" },
};

function hrefFor(path: string): string {
  // Dynamische Segmente können nicht direkt verlinkt werden → nächster statischer Vorfahre.
  if (!path.includes("[")) return path;
  const segments = path.split("/").filter((s) => !s.startsWith("["));
  return segments.join("/") || "/";
}

function badgeStyle(color: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    color,
    border: `1px solid ${color}33`,
    backgroundColor: `${color}0d`,
    padding: "0.1rem 0.5rem",
    borderRadius: "999px",
    whiteSpace: "nowrap",
  };
}

const cardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "0.75rem 1rem",
  backgroundColor: "#fff",
};

export default function HomePage() {
  const routes = listRoutes();
  const pages = routes.filter((r) => r.kind === "page");
  const apis = routes.filter((r) => r.kind === "api");

  return (
    <main style={{ maxWidth: "880px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1>Abschlussprojekt Beziehung — Dev-Übersicht</h1>
      <p style={{ color: "#555" }}>
        Live aus <code>app/</code> gescannt — {pages.length} Seiten, {apis.length} API-Routes im
        aktuellen Stand. Status: 🟢 geht · 🟡 Login nötig · 🔴 geplant / fehlt.
      </p>

      <section style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Seiten</h2>
        <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.75rem" }}>
          {pages.map((r) => {
            const meta = getMeta(r.kind, r.path);
            const b = STATUS_META[meta.status];
            return (
              <div key={r.path} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <a
                    href={hrefFor(r.path)}
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      color: "#1d4ed8",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    {r.path}
                  </a>
                  <span style={badgeStyle(b.color)}>
                    {b.emoji} {b.text}
                  </span>
                </div>
                {meta.hint && (
                  <div style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    {meta.hint}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ marginTop: "1.75rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>API-Routes</h2>
        <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.75rem" }}>
          {apis.map((r) => {
            const meta = getMeta(r.kind, r.path);
            const b = STATUS_META[meta.status];
            return (
              <div
                key={r.path}
                style={{
                  ...cardStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <code style={{ color: "#111" }}>{r.path}</code>
                <span style={badgeStyle(b.color)}>
                  {b.emoji} {b.text}
                </span>
                {meta.hint && <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>({meta.hint})</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ marginTop: "1.75rem", ...cardStyle }}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Hinweis</h2>
        <p style={{ color: "#555", marginTop: "0.5rem", lineHeight: 1.5 }}>
          Dev-Helper (Throwaway). Dynamische Routes wie <code>/klassen/[id]</code> brauchen eine
          echte ID — am besten über <Link href="/klassen" style={{ color: "#1d4ed8" }}>/klassen</Link>{" "}
          navigieren. Die Liste wird zur Laufzeit aus dem Dateisystem erzeugt; Status-Badges aus{" "}
          <code>route-meta.ts</code> (Coverage-Test erzwingt Pflege).
        </p>
      </section>
    </main>
  );
}
