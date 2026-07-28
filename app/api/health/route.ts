import { NextResponse } from "next/server";
import { Client } from "pg";
import { buildHealthResponse } from "./rule";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const url = process.env.DATABASE_URL ?? "";
  let db = false;
  if (url) {
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 2000 });
    try {
      await client.connect();
      await client.query("SELECT 1");
      db = true;
    } catch {
      db = false;
    } finally {
      await client.end().catch(() => {});
    }
  }
  const { status, body } = buildHealthResponse({ ok: true, db });
  return NextResponse.json(body, { status });
}