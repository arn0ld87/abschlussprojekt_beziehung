import { readdirSync, type Dirent } from "node:fs";
import { join, relative, sep } from "node:path";

export type RouteKind = "page" | "api";
export type RouteStatus = "green" | "yellow" | "red";

export interface RouteMetaEntry {
  status: RouteStatus;
  hint?: string;
}

export interface ScannedRoute {
  path: string;
  kind: RouteKind;
}

// Single Source of Truth für die Status-Badges der Dev-Startseite.
// Schlüssel: `${kind}:${path}`. Der Coverage-Test in
// tests/dev/route-meta-coverage.test.ts stellt sicher, dass jede live
// gescannte Route hier gepflegt ist und kein Eintrag verwaist.
export const ROUTE_META: Record<string, RouteMetaEntry> = {
  "page:/": { status: "green" },
  "page:/signin": { status: "green", hint: "Login-/Registrierungsseite" },
  "page:/design": { status: "green", hint: "Design-System" },
  "page:/protected": { status: "yellow", hint: "Login nötig" },
  "page:/klassen": { status: "yellow", hint: "Klassenliste, Login nötig" },
  "page:/klassen/neu": { status: "yellow", hint: "Neue Klasse, Login nötig" },
  "page:/klassen/[id]": { status: "yellow", hint: "Klassendetail — Klassen-ID nötig, ab /klassen navigieren" },
  "page:/klassen/[id]/edit": { status: "yellow", hint: "Klasse bearbeiten — ab /klassen navigieren" },
  "page:/raeume": { status: "yellow", hint: "Raumliste, Login nötig · M2-49" },
  "page:/raeume/neu": { status: "yellow", hint: "Neue Raumvorlage, Login nötig · M2-49" },
  "page:/raeume/[id]": { status: "yellow", hint: "Raum-Editor-Shell — ab /raeume navigieren · M2-49" },
  "api:/api/health": { status: "green" },
  "api:/api/auth/sign-in": { status: "green" },
  "api:/api/auth/sign-out": { status: "green" },
  "api:/api/auth/sign-up": { status: "green" },
  "api:/api/klassen": { status: "green" },
  "api:/api/klassen/[id]": { status: "green" },
  "api:/api/raeume": { status: "green", hint: "M2-49" },
  "api:/api/raeume/[id]": { status: "green", hint: "M2-49" },
  "api:/api/raeume/[id]/objekte": { status: "green", hint: "M2-51" },
  "api:/api/raeume/[id]/objekte/[objektId]": { status: "green", hint: "M2-52" },
  "api:/api/klassen/[id]/import/preview": { status: "yellow", hint: "Login nötig · M1-46" },
  "api:/api/klassen/[id]/import/commit": { status: "yellow", hint: "Login nötig · M1-46" },
  "api:/api/klassen/[id]/schueler": { status: "green" },
  "api:/api/klassen/[id]/schueler/[sid]": { status: "green" },
  "api:/api/klassen/[id]/schueler/[sid]/foto": { status: "green", hint: "M1-45" },
  "api:/api/klassen/[id]/schueler/[sid]/sitzregeln": { status: "green", hint: "M1-44" },
  "api:/api/klassen/[id]/schueler/[sid]/sitzregeln/[rid]": { status: "green", hint: "M1-44" },
};

export function metaKey(kind: RouteKind, path: string): string {
  return `${kind}:${path}`;
}

export function getMeta(kind: RouteKind, path: string): RouteMetaEntry {
  return ROUTE_META[metaKey(kind, path)] ?? { status: "green" };
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

export function listRoutes(appRoot = join(process.cwd(), "app")): ScannedRoute[] {
  const acc: ScannedRoute[] = [];
  scanRoutes(appRoot, appRoot, acc);
  // Dedup (page+route im selben Segment) und sortieren.
  const seen = new Set<string>();
  return acc
    .filter((r) => (seen.has(r.path + ":" + r.kind) ? false : (seen.add(r.path + ":" + r.kind), true)))
    .sort((a, b) =>
      a.kind !== b.kind ? (a.kind === "page" ? -1 : 1) : a.path.localeCompare(b.path)
    );
}
