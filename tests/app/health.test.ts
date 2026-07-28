import { describe, expect, it } from "vitest";
import { buildHealthResponse } from "../../app/api/health/rule.ts";

describe("buildHealthResponse (M0 #20 health route rule)", () => {
  it("reports ok and db up when the database probe succeeds", () => {
    const res = buildHealthResponse({ ok: true, db: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "up" });
  });

  it("reports 503 and db down when the database probe fails", () => {
    const res = buildHealthResponse({ ok: false, db: false });
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "degraded", db: "down" });
  });

  it("treats a missing database probe as degraded even if ok was passed true", () => {
    const res = buildHealthResponse({ ok: true, db: false });
    expect(res.status).toBe(503);
    expect(res.body.db).toBe("down");
  });

  it("always returns a stable status string and a db field", () => {
    expect(buildHealthResponse({ ok: true, db: true }).body.status).toBe("ok");
    expect(buildHealthResponse({ ok: false, db: false }).body.status).toBe("degraded");
  });
});