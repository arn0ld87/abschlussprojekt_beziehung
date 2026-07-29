import { readdirSync, type Dirent } from "node:fs";
import { join, relative, sep } from "node:path";
import type { CSSProperties } from "react";

// Dev-Übersicht zur Laufzeit: scannt app/ nach page.tsx/route.ts.
// Neue Routes erscheinen automatisch; nur Status-Badges sind unten annotiert.
export const dynamic = "force-dynamic";

type RouteKind = "page" | "api";
interface ScannedRoute {
  path: string;
  kind: RouteKind;
}

function scanRoutes(dir: string, appRoot: string, acc: ScannedRoute[]) {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      // _-prefixed Verzeichnisse (_components, _not-found, node_modules) überspringen.
      if (e.name.startsWith("_") || e.name === "node_modules") continue;
      scanRoutes(join(dir, e.name), appRoot, acc);
      continue;
    }
    if (e.name !== "page.tsx" && e.name !== "page.ts" && e.name !== "route.ts") continue;
    const rel = relative(appRoot, dir).split(sep).join("/");
    const segments = rel
      .split("/")
      .filter((s) => !(s.startsWith("(") && s.endsWith(")")) && s.length > 0);
    const path = "/" + segments.join("/");
    const kind: RouteKind = e.name.startsWith("route") ? "api" : "page";
    acc.push({ path: path === "/" ? path : path.replace(/\/+$/, "") || "/", kind });
  }
}

function listRoutes(): ScannedRoute[] {
  const acc: ScannedRoute[] = [];
  scanRoutes(join(process.cwd(), "app"), join(process.cwd(), "app"), acc);
  // Dedup (page+route im selben Segment) und sortieren.
  const seen = new Set<string>();
  return acc
    .filter((r) => (seen.has(r.path + ":" + r.kind) ? false : (seen.add(r.path + ":" + r.kind), true)))
    .sort((a, b) =>
      a.kind !== b.kind ? (a.kind === "page" ? -1 : 1) : a.path.localeCompare(b.path)
    );
}

// Status-Annotationen für bekannte Routes. Nicht gelistete Routes → 🟢 (unbestätigt).
type Status = "green" | "yellow" | "red";
const STATUS_META: Record<Status, { emoji: string; text: string; color: string }> = {
  green: { emoji: "🟢", text: "geht", color: "#15803d" },
  yellow: { emoji: "🟡", text: "Login nötig", color: "#b45309" },
  red: { emoji: "🔴", text: "geplant / fehlt", color: "#b91c1c" },
};

const PAGE_HINTS: Record<string, { status: Status; hint?: string }> = {
  "/": { status: "green" },
  "/signin": { status: "green", hint: "Login-/Registrierungsseite" },
  "/design": { status: "green", hint: "Design-System" },
  "/protected": { status: "yellow", hint: "Login nötig" },
  "/klassen": { status: "yellow", hint: "Klassenliste, Login nötig" },
  "/klassen/neu": { status: "yellow", hint: "Neue Klasse, Login nötig" },
  "/klassen/[id]": { status: "yellow", hint: "Klassendetail — Klassen-ID nötig, ab /klassen navigieren" },
  "/klassen/[id]/edit": { status: "yellow", hint: "Klasse bearbeiten — ab /klassen navigieren" },
};

const API_HINTS: Record<string, { status: Status; hint?: string }> = {
  "/api/health": { status: "green" },
  "/api/auth/sign-in": { status: "green" },
  "/api/auth/sign-out": { status: "green" },
  "/api/auth/sign-up": { status: "green" },
  "/api/klassen": { status: "green" },
  "/api/klassen/[id]": { status: "green" },
  "/api/klassen/[id]/schueler": { status: "green" },
  "/api/klassen/[id]/schueler/[sid]": { status: "green" },
  "/api/klassen/[id]/schueler/[sid]/foto": { status: "green", hint: "M1-45" },
  "/api/klassen/[id]/schueler/[sid]/sitzregeln": { status: "green", hint: "M1-44" },
  "/api/klassen/[id]/schueler/[sid]/sitzregeln/[rid]": { status: "green", hint: "M1-44" },
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
        aktuellen Stand. Status: 🟢 geht · 🟡 Login nötig · 🔴 geplant / fehlt. Nicht annotierte
        Routes sind 🟢 (Status ggf. selbst prüfen).
      </p>

      <section style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Seiten</h2>
        <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.75rem" }}>
          {pages.map((r) => {
            const meta = PAGE_HINTS[r.path] ?? { status: "green" as Status };
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
            const meta = API_HINTS[r.path] ?? { status: "green" as Status };
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
          echte ID — am besten über <a href="/klassen" style={{ color: "#1d4ed8" }}>/klassen</a>{" "}
          navigieren. Die Liste wird zur Laufzeit aus dem Dateisystem erzeugt und bleibt ohne
          manuelle Pflege aktuell.
        </p>
      </section>
    </main>
  );
}