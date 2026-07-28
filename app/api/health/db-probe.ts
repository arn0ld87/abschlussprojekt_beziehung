import { Client } from "pg";

/**
 * Frameworkunabhängiger Datenbank-Probe: öffnet eine pg-Verbindung,
 * führt SELECT 1 mit explizitem Verbindungs-, Query- und Statement-Timeout
 * aus und schließt den Client im finally. Wirft nie; liefert nur einen
 * boolean, den der Route-Handler 1:1 an buildHealthResponse weitergibt.
 */
export async function probeDatabase(url: string): Promise<boolean> {
  if (!url) return false;
  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 2000,
    query_timeout: 2000,
    options: "-c statement_timeout=2000",
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}