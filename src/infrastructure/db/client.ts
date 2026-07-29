import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

export function getDb(connectionString?: string): NodePgDatabase<typeof schema> {
  if (dbInstance) return dbInstance;

  const url = connectionString ?? process.env.DATABASE_URL;

  if (!url && process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production environment.");
  }

  const targetUrl = url ?? "postgres://postgres:changeme@localhost:5432/sitzplan";

  pool = new Pool({
    connectionString: targetUrl,
    max: 10,
    connectionTimeoutMillis: 3000,
  });

  dbInstance = drizzle(pool, { schema });
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
    dbInstance = null;
  }
}
