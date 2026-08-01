import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Schuetzt die Konsistenz zwischen drizzle/_journal.json, den SQL-Migrationen
 * und der Snapshot-Kette.
 *
 * drizzle-kit generate difft schema.ts ausschliesslich gegen den Snapshot des
 * letzten Journal-Eintrags. Fehlt dieser Snapshot, rechnet generate gegen einen
 * veralteten oder leeren Stand und erzeugt Migrationen, die bereits vorhandene
 * Tabellen erneut anlegen. Genau das war der Zustand vor Issue #148.
 */
const drizzleDir = resolve(process.cwd(), "drizzle");
const metaDir = resolve(drizzleDir, "meta");

type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

const journal = JSON.parse(
  readFileSync(resolve(metaDir, "_journal.json"), "utf8"),
) as { version: string; dialect: string; entries: JournalEntry[] };

const entries = journal.entries;
const snapshotName = (idx: number) => `${String(idx).padStart(4, "0")}_snapshot.json`;

describe("drizzle journal", () => {
  it("has at least one entry", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("numbers entries gapless and ascending from zero", () => {
    expect(entries.map((entry) => entry.idx)).toEqual(
      entries.map((_, index) => index),
    );
  });

  /**
   * drizzle ordnet ueber idx, nicht ueber when. Ein Zeitstempel, der aus der
   * Reihe faellt, verraet aber ein von Hand verbogenes Journal — also genau die
   * Fehlerklasse, die zu Issue #148 gefuehrt hat.
   */
  it("orders timestamps strictly ascending", () => {
    const timestamps = entries.map((entry) => entry.when);
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    expect(new Set(timestamps).size).toBe(timestamps.length);
  });

  it("references an existing sql file for every entry", () => {
    const missing = entries
      .filter((entry) => !existsSync(resolve(drizzleDir, `${entry.tag}.sql`)))
      .map((entry) => entry.tag);
    expect(missing).toEqual([]);
  });

  it("has no sql file without a journal entry", () => {
    const tags = new Set(entries.map((entry) => `${entry.tag}.sql`));
    const orphans = readdirSync(drizzleDir)
      .filter((file) => file.endsWith(".sql"))
      .filter((file) => !tags.has(file));
    expect(orphans).toEqual([]);
  });

  /**
   * Aeltere Snapshots fehlen historisch und lassen sich nicht rekonstruieren.
   * Fuer generate zaehlt allein der Snapshot des letzten Eintrags.
   */
  it("has a snapshot for the latest entry", () => {
    const latest = entries[entries.length - 1]!;
    expect(existsSync(resolve(metaDir, snapshotName(latest.idx)))).toBe(true);
  });
});
