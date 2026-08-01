import { describe, it, expect } from 'vitest';
import { SitzplanDokumentV1Schema } from '../../src/domain/sitzplan';
import type { Zuordnung } from '../../src/domain/sitzplan';
import { setzeSchueler, tausche, entferne, ablageSchuelerIds } from '../../src/domain/sitzplan/zuordnung-commands';
import { erzeugeSitzplaetze } from '../../src/domain/raum/sitzplaetze';
import type { RaumObjektV1 } from '../../src/domain/raum/objekte';

// Property-Tests (M3 #57): Nach beliebigen Command-Folgen gelten Eindeutigkeit
// und Referenzintegrität. Der Zufall ist bewusst seed-gesteuert und damit
// reproduzierbar — ein fehlgeschlagener Lauf ist ohne Zusatzinformation
// wiederholbar.

/** Deterministischer PRNG (mulberry32) — reproduzierbare Command-Folgen. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tische: RaumObjektV1[] = [
  { id: 'obj_a', typ: 'table_double', x_cm: 50, y_cm: 50, breite_cm: 120, tiefe_cm: 60, rotation_deg: 0 },
  { id: 'obj_b', typ: 'table_double', x_cm: 300, y_cm: 50, breite_cm: 120, tiefe_cm: 60, rotation_deg: 0 },
  { id: 'obj_c', typ: 'table_single', x_cm: 50, y_cm: 300, breite_cm: 60, tiefe_cm: 60, rotation_deg: 0 },
];

const sitzplaetze = tische.flatMap((t) => erzeugeSitzplaetze(t));
const sitzplatzIds = sitzplaetze.map((s) => s.id);
// Bewusst mehr Schülerprofile als Sitzplätze: Die Ablage darf nie leer laufen.
const schuelerIds = Array.from({ length: 8 }, (_, i) => `sch_fantasie_${i + 1}`);

function dokument(zuordnungen: Zuordnung[]) {
  return {
    version: 1,
    quelle: { klasseId: 'kls_fantasie', raumId: 'raum_fantasie' },
    raumGeometrie: {
      breiteCm: 800,
      laengeCm: 600,
      rasterCm: 10,
      objekte: tische,
      sitzplaetze,
    },
    zuordnungen,
  };
}

function pruefeInvarianten(zuordnungen: Zuordnung[], schritt: string) {
  const belegteSitze = zuordnungen.map((z) => z.sitzplatzId);
  const belegteSchueler = zuordnungen.map((z) => z.schuelerId);

  // Referenzintegrität: nur existierende Sitzplätze des eingefrorenen Raums
  for (const id of belegteSitze) {
    expect(sitzplatzIds, schritt).toContain(id);
  }
  // Eindeutigkeit: höchstens ein Schüler je Sitzplatz
  expect(new Set(belegteSitze).size, schritt).toBe(belegteSitze.length);
  // Eindeutigkeit: höchstens ein Sitzplatz je Schüler
  expect(new Set(belegteSchueler).size, schritt).toBe(belegteSchueler.length);
  // Deterministische Reihenfolge: stabil nach sitzplatzId sortiert
  expect(belegteSitze, schritt).toEqual([...belegteSitze].sort());
  // Der Vertrag akzeptiert genau diese Zustände
  expect(SitzplanDokumentV1Schema.safeParse(dokument(zuordnungen)).success, schritt).toBe(true);
}

describe('Zuordnungs-Property-Tests (M3 #57)', () => {
  it('hält Eindeutigkeit und Referenzintegrität nach beliebigen Command-Folgen', () => {
    for (const seed of [1, 7, 42, 1337, 2026]) {
      const zufall = prng(seed);
      const waehle = <T,>(werte: readonly T[]): T => werte[Math.floor(zufall() * werte.length)];

      let zuordnungen: Zuordnung[] = [];
      pruefeInvarianten(zuordnungen, `seed ${seed}, Start`);

      for (let schritt = 0; schritt < 200; schritt++) {
        const kommando = Math.floor(zufall() * 3);
        const kontext = `seed ${seed}, Schritt ${schritt}, Kommando ${kommando}`;

        if (kommando === 0) {
          zuordnungen = setzeSchueler(zuordnungen, {
            schuelerId: waehle(schuelerIds),
            sitzplatzId: waehle(sitzplatzIds),
          });
        } else if (kommando === 1) {
          zuordnungen = tausche(zuordnungen, waehle(sitzplatzIds), waehle(sitzplatzIds));
        } else {
          zuordnungen = entferne(zuordnungen, waehle(schuelerIds));
        }

        pruefeInvarianten(zuordnungen, kontext);

        // Jeder Schüler ist genau einmal vorhanden: Ablage oder genau ein Platz
        const inAblage = ablageSchuelerIds(schuelerIds, zuordnungen);
        const sitzend = zuordnungen.map((z) => z.schuelerId);
        expect([...inAblage, ...sitzend].sort(), kontext).toEqual([...schuelerIds].sort());
      }
    }
  });

  it('lässt die Gesamtzahl belegter Plätze nie über die Sitzplatzanzahl steigen', () => {
    const zufall = prng(99);
    let zuordnungen: Zuordnung[] = [];

    for (let schritt = 0; schritt < 300; schritt++) {
      zuordnungen = setzeSchueler(zuordnungen, {
        schuelerId: schuelerIds[Math.floor(zufall() * schuelerIds.length)],
        sitzplatzId: sitzplatzIds[Math.floor(zufall() * sitzplatzIds.length)],
      });
      expect(zuordnungen.length).toBeLessThanOrEqual(Math.min(sitzplatzIds.length, schuelerIds.length));
    }
  });

  it('lehnt jede von Hand konstruierte Verletzung der drei Invarianten ab', () => {
    const gueltig: Zuordnung[] = [
      { sitzplatzId: sitzplatzIds[0], schuelerId: schuelerIds[0] },
      { sitzplatzId: sitzplatzIds[1], schuelerId: schuelerIds[1] },
    ];
    expect(SitzplanDokumentV1Schema.safeParse(dokument(gueltig)).success).toBe(true);

    // Unbekannter Sitzplatz
    expect(
      SitzplanDokumentV1Schema.safeParse(
        dokument([{ sitzplatzId: 'obj_x__sitz_1', schuelerId: schuelerIds[0] }]),
      ).success,
    ).toBe(false);

    // Doppelt belegter Sitzplatz
    expect(
      SitzplanDokumentV1Schema.safeParse(
        dokument([
          { sitzplatzId: sitzplatzIds[0], schuelerId: schuelerIds[0] },
          { sitzplatzId: sitzplatzIds[0], schuelerId: schuelerIds[1] },
        ]),
      ).success,
    ).toBe(false);

    // Schüler auf zwei Plätzen
    expect(
      SitzplanDokumentV1Schema.safeParse(
        dokument([
          { sitzplatzId: sitzplatzIds[0], schuelerId: schuelerIds[0] },
          { sitzplatzId: sitzplatzIds[1], schuelerId: schuelerIds[0] },
        ]),
      ).success,
    ).toBe(false);
  });
});
