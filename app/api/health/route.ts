import { NextResponse } from "next/server";
import { probeDatabase } from "./db-probe";
import { buildHealthResponse } from "./rule";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const url = process.env.DATABASE_URL ?? "";
  const db = await probeDatabase(url);
  const { status, body } = buildHealthResponse({ ok: true, db });
  return NextResponse.json(body, { status });
}