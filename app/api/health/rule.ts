export type HealthInput = { ok: boolean; db: boolean };

export type HealthBody = { status: "ok" | "degraded"; db: "up" | "down" };

export type HealthResponse = { status: number; body: HealthBody };

export function buildHealthResponse({ ok, db }: HealthInput): HealthResponse {
  const body: HealthBody = { status: ok && db ? "ok" : "degraded", db: db ? "up" : "down" };
  return { status: body.status === "ok" ? 200 : 503, body };
}