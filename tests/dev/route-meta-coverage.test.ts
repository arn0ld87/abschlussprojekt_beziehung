import { describe, it, expect } from "vitest";
import { listRoutes, ROUTE_META, metaKey } from "../../app/route-meta";

// Dev-Startseite bleibt aktuell: jede live gescannte Route muss in
// route-meta.ts gepflegt sein (sonst rotiert der Status nicht mit dem
// echten Stand), und kein Meta-Eintrag darf verwaist sein (Route wurde
// entfernt). Beides zwingt Pflege pro Slice an einer einzigen Stelle.
describe("Dev-Startseite Route-Meta Coverage", () => {
  it("jede gescannte Route hat einen Meta-Eintrag", () => {
    const routes = listRoutes();
    const missing = routes
      .filter((r) => !ROUTE_META[metaKey(r.kind, r.path)])
      .map((r) => metaKey(r.kind, r.path));
    expect(missing).toEqual([]);
  });

  it("kein Meta-Eintrag verweist auf eine nicht mehr existierende Route", () => {
    const routes = listRoutes();
    const present = new Set(routes.map((r) => metaKey(r.kind, r.path)));
    const stale = Object.keys(ROUTE_META).filter((k) => !present.has(k));
    expect(stale).toEqual([]);
  });
});