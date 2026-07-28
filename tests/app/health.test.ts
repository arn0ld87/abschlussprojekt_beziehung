import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildHealthResponse } from "../../app/api/health/rule.ts";

vi.mock("../../app/api/health/db-probe", () => ({
  probeDatabase: vi.fn(),
}));

import { probeDatabase } from "../../app/api/health/db-probe";
import { GET } from "../../app/api/health/route";

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

describe("GET /api/health (M0 #20 route handler delegates to the database probe)", () => {
  const probe = probeDatabase as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DATABASE_URL;
  });

  it("returns 200 and db up when the probe succeeds, forwarding the resolved URL", async () => {
    process.env.DATABASE_URL = "postgres://u:p@host:5432/db";
    probe.mockResolvedValue(true);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", db: "up" });
    expect(probe).toHaveBeenCalledWith("postgres://u:p@host:5432/db");
  });

  it("returns 503 and db down when the probe reports a connection or query failure", async () => {
    process.env.DATABASE_URL = "postgres://u:p@host:5432/db";
    probe.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "degraded", db: "down" });
  });

  it("returns 503 when DATABASE_URL is unset (probe receives an empty URL and degrades)", async () => {
    probe.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "degraded", db: "down" });
    expect(probe).toHaveBeenCalledWith("");
  });
});