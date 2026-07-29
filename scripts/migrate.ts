import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString && process.env.NODE_ENV === "production") {
    console.error("DATABASE_URL is required in production environment.");
    process.exitCode = 1;
    return;
  }

  const targetUrl = connectionString ?? "postgres://postgres:postgres@localhost:5432/sitzplan";

  console.log("Running database migrations.");
  const pool = new Pool({ connectionString: targetUrl });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
