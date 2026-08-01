import { describe, it, expect } from 'vitest';
import { erzeugeSitzplaetze } from '../../src/domain/raum/sitzplaetze';
import type { RaumObjektV1 } from '../../src/domain/raum/objekte';
import { SitzplanDokumentV1Schema } from '../../src/domain/sitzplan';

// Der Sitzplan friert die Raumgeometrie ein (ADR-0003). Das eingefrorene
// Dokument muss denselben harten Geometrievertrag erfüllen wie die Vorlage:
// ein persistiertes SitzplanDokumentV1 darf keine Zustände zulassen, die
// RaumDokumentV3Schema ablehnt. Sonst entsteht ein schwächerer Parallel-
// vertrag, sobald ab M3 #57/#59 der Editor Geometrie zurückschreibt.

const einzeltisch: RaumObjektV1 = {
  id: 'obj_t1',
  typ: 'table_single',
  x_cm: 100,
  y_cm: 100,
  breite_cm: 60,
  tiefe_cm: 50,
  rotation_deg: 0,
};

const dokument = (geometrie: Record<string, unknown>) => ({
  version: 1,
  quelle: { klasseId: 'k1', raumId: 'r1' },
  raumGeometrie: {
    breiteCm: 800,
    laengeCm: 600,
    rasterCm: 10,
    objekte: [einzeltisch],
    sitzplaetze: erzeugeSitzplaetze(einzeltisch),
    ...geometrie,
  },
  zuordnungen: [],
});

describe('SitzplanDokumentV1 erbt den Raumgeometrie-Vertrag (M3 #56)', () => {
  it('akzeptiert eine gültige eingefrorene Geometrie', () => {
    expect(SitzplanDokumentV1Schema.safeParse(dokument({})).success).toBe(true);
  });

  it('lehnt ein Raster ab, das die kleinere Raumseite überschreitet', () => {
    const ergebnis = SitzplanDokumentV1Schema.safeParse(dokument({ rasterCm: 900 }));
    expect(ergebnis.success).toBe(false);
  });

  it('lehnt Objekte außerhalb der Raumgrenzen ab', () => {
    const ergebnis = SitzplanDokumentV1Schema.safeParse(
      dokument({ objekte: [{ ...einzeltisch, x_cm: 5000 }] }),
    );
    expect(ergebnis.success).toBe(false);
  });

  it('lehnt doppelte Objekt-IDs ab', () => {
    const ergebnis = SitzplanDokumentV1Schema.safeParse(
      dokument({
        objekte: [einzeltisch, { ...einzeltisch, x_cm: 300 }],
        sitzplaetze: erzeugeSitzplaetze(einzeltisch),
      }),
    );
    expect(ergebnis.success).toBe(false);
  });

  it('lehnt Sitzplätze ohne existierendes Tischobjekt ab', () => {
    const ergebnis = SitzplanDokumentV1Schema.safeParse(
      dokument({
        sitzplaetze: erzeugeSitzplaetze(einzeltisch).map((s) => ({ ...s, objektId: 'obj_fehlt' })),
      }),
    );
    expect(ergebnis.success).toBe(false);
  });

  it('lehnt einen Tisch ohne seine kanonischen Sitzplätze ab', () => {
    const ergebnis = SitzplanDokumentV1Schema.safeParse(dokument({ sitzplaetze: [] }));
    expect(ergebnis.success).toBe(false);
  });
});

// Der Zuordnungsteil des Vertrags (M3 #57). Die Invarianten hängen an der
// eingefrorenen Geometrie: Ein Plan kann nur Sitzplätze belegen, die sein
// eigenes Raumdokument kennt.
describe('SitzplanDokumentV1 sichert die Zuordnungs-Invarianten (M3 #57)', () => {
  const platz = erzeugeSitzplaetze(einzeltisch)[0].id;
  const mitZuordnungen = (zuordnungen: unknown) => ({ ...dokument({}), zuordnungen });

  it('akzeptiert eine gültige Zuordnung auf einen eingefrorenen Sitzplatz', () => {
    const ergebnis = SitzplanDokumentV1Schema.safeParse(
      mitZuordnungen([{ sitzplatzId: platz, schuelerId: 'sch_fantasie_1' }]),
    );
    expect(ergebnis.success).toBe(true);
  });

  it('lehnt Zuordnungen auf unbekannte Sitzplätze ab', () => {
    const ergebnis = SitzplanDokumentV1Schema.safeParse(
      mitZuordnungen([{ sitzplatzId: 'obj_fehlt__sitz_1', schuelerId: 'sch_fantasie_1' }]),
    );
    expect(ergebnis.success).toBe(false);
    expect(ergebnis.success === false && ergebnis.error.errors[0].message).toMatch(/Sitzplatz/);
  });

  it('lehnt einen doppelt belegten Sitzplatz ab', () => {
    const ergebnis = SitzplanDokumentV1Schema.safeParse(
      mitZuordnungen([
        { sitzplatzId: platz, schuelerId: 'sch_fantasie_1' },
        { sitzplatzId: platz, schuelerId: 'sch_fantasie_2' },
      ]),
    );
    expect(ergebnis.success).toBe(false);
  });

  it('lehnt unvollständige Zuordnungseinträge ab', () => {
    expect(SitzplanDokumentV1Schema.safeParse(mitZuordnungen([{ sitzplatzId: platz }])).success).toBe(false);
    expect(SitzplanDokumentV1Schema.safeParse(mitZuordnungen([{ sitzplatzId: '', schuelerId: 'x' }])).success).toBe(
      false,
    );
  });
});
