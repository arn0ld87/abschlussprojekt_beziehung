import { describe, it, expect, beforeEach } from 'vitest';
import {
  SITZPLAETZE_PRO_TISCH,
  SitzplatzV1Schema,
  dupliziereSitzplaetze,
  entferneSitzplaetzeVon,
  erzeugeSitzplaetze,
  istTisch,
  sitzplatzAufObjekt,
  sitzplatzAnker,
  sitzplatzWeltPosition,
} from '../../src/domain/raum/sitzplaetze';
import { RaumDokumentV3Schema, migriereRaumDokument } from '../../src/domain/raum/raum';
import { Raum, RaumService } from '../../src/domain/raum';
import { InMemoryRaumRepository } from '../../src/infrastructure/db/in-memory-raum-repository';
import type { RaumObjektV1 } from '../../src/domain/raum/objekte';

// canvasDocument ist die Lese-Union (V1|V2|V3) — der migrierte Stand macht
// sitzplaetze typsicher zugänglich (bei V3-Dokumenten eine No-op).
const dok = (r: Raum) => migriereRaumDokument(r.canvasDocument);

const einzeltisch: RaumObjektV1 = {
  id: 'obj_t1',
  typ: 'table_single',
  x_cm: 100,
  y_cm: 100,
  breite_cm: 60,
  tiefe_cm: 50,
  rotation_deg: 0,
};

const doppeltisch: RaumObjektV1 = {
  id: 'obj_t2',
  typ: 'table_double',
  x_cm: 300,
  y_cm: 100,
  breite_cm: 120,
  tiefe_cm: 50,
  rotation_deg: 0,
};

describe('SitzplatzV1-Vertrag und Geometrie (M2 #54)', () => {
  it('erzeugt die festgelegte Anzahl adressierbarer Sitzplätze pro Tischtyp', () => {
    expect(SITZPLAETZE_PRO_TISCH.table_single).toBe(1);
    expect(SITZPLAETZE_PRO_TISCH.table_double).toBe(2);
    expect(erzeugeSitzplaetze(einzeltisch)).toHaveLength(1);
    expect(erzeugeSitzplaetze(doppeltisch)).toHaveLength(2);
  });

  it('erzeugt keine Sitzplätze für Lehrerpult, Tafel, Tür oder Fenster', () => {
    for (const typ of ['teacher_desk', 'board', 'door', 'window'] as const) {
      expect(istTisch(typ)).toBe(false);
      expect(erzeugeSitzplaetze({ ...einzeltisch, typ })).toEqual([]);
    }
  });

  it('erzeugt deterministisch stabile IDs, lokale Anker und Bezeichnungen', () => {
    const a = erzeugeSitzplaetze(doppeltisch);
    const b = erzeugeSitzplaetze(doppeltisch);
    expect(a).toEqual(b); // deterministisch
    expect(a.map((s) => s.id)).toEqual(['obj_t2__sitz_1', 'obj_t2__sitz_2']);
    for (const s of a) {
      expect(s.objektId).toBe('obj_t2');
      expect(s.bezeichnung).toMatch(/^Platz \d+$/);
      expect(SitzplatzV1Schema.safeParse(s).success).toBe(true);
      expect(sitzplatzAufObjekt(s, doppeltisch)).toBe(true);
    }
  });

  it('verteilt die Anker gleichmäßig auf der Stirnseite innerhalb der Tischgeometrie', () => {
    expect(sitzplatzAnker(60, 50, 0, 1)).toEqual({ lokalX_cm: 30, lokalY_cm: 50 });
    expect(sitzplatzAnker(120, 50, 0, 2)).toEqual({ lokalX_cm: 40, lokalY_cm: 50 });
    expect(sitzplatzAnker(120, 50, 1, 2)).toEqual({ lokalX_cm: 80, lokalY_cm: 50 });
  });
});

describe('Sitzplatz-Weltposition bei allen vier Rotationen (Render-Test)', () => {
  // Tisch 60×50 an (100,100): Mittelpunkt (130,125), Anker (30,50) lokal
  const sitz = erzeugeSitzplaetze(einzeltisch)[0];

  it('0°: Anker auf der unteren Kante', () => {
    const welt = sitzplatzWeltPosition(sitz, einzeltisch);
    expect(welt.x_cm).toBeCloseTo(130, 6);
    expect(welt.y_cm).toBeCloseTo(150, 6);
  });

  it('90°: Anker wandert auf die linke Kante (Mittelpunktsrotation wie Konva)', () => {
    const gedreht = { ...einzeltisch, rotation_deg: 90 as const };
    const welt = sitzplatzWeltPosition(sitz, gedreht);
    expect(welt.x_cm).toBeCloseTo(105, 6); // Mittelpunkt x - halbe Tiefe
    expect(welt.y_cm).toBeCloseTo(125, 6);
  });

  it('180°: Anker wandert auf die obere Kante', () => {
    const gedreht = { ...einzeltisch, rotation_deg: 180 as const };
    const welt = sitzplatzWeltPosition(sitz, gedreht);
    expect(welt.x_cm).toBeCloseTo(130, 6);
    expect(welt.y_cm).toBeCloseTo(100, 6);
  });

  it('270°: Anker wandert auf die rechte Kante', () => {
    const gedreht = { ...einzeltisch, rotation_deg: 270 as const };
    const welt = sitzplatzWeltPosition(sitz, gedreht);
    expect(welt.x_cm).toBeCloseTo(155, 6);
    expect(welt.y_cm).toBeCloseTo(125, 6);
  });
});

describe('RaumDokumentV3: Parent-Integrität und Tischgeometrie (M2 #54)', () => {
  const basis = { version: 3 as const, breiteCm: 800, laengeCm: 600, rasterCm: 50 };

  it('nimmt ein Dokument mit Tischen und gültigen Sitzplätzen an', () => {
    const parsed = RaumDokumentV3Schema.safeParse({
      ...basis,
      objekte: [einzeltisch, doppeltisch],
      sitzplaetze: [...erzeugeSitzplaetze(einzeltisch), ...erzeugeSitzplaetze(doppeltisch)],
    });
    expect(parsed.success).toBe(true);
  });

  it('lehnt Sitzplätze mit fehlendem Parent-Objekt ab', () => {
    const parsed = RaumDokumentV3Schema.safeParse({
      ...basis,
      objekte: [einzeltisch],
      sitzplaetze: [{ id: 's1', objektId: 'obj_fehlt', lokalX_cm: 10, lokalY_cm: 10 }],
    });
    expect(parsed.success).toBe(false);
  });

  it('lehnt Sitzplätze an Nicht-Tisch-Objekten ab', () => {
    const pult: RaumObjektV1 = { id: 'obj_p', typ: 'teacher_desk', x_cm: 100, y_cm: 55, breite_cm: 160, tiefe_cm: 80, rotation_deg: 0 };
    const parsed = RaumDokumentV3Schema.safeParse({
      ...basis,
      objekte: [pult],
      sitzplaetze: [{ id: 's1', objektId: 'obj_p', lokalX_cm: 10, lokalY_cm: 10 }],
    });
    expect(parsed.success).toBe(false);
  });

  it('lehnt Sitzplätze außerhalb der fachlichen Tischgeometrie ab', () => {
    const parsed = RaumDokumentV3Schema.safeParse({
      ...basis,
      objekte: [einzeltisch],
      sitzplaetze: [{ id: 's1', objektId: einzeltisch.id, lokalX_cm: 61, lokalY_cm: 10 }],
    });
    expect(parsed.success).toBe(false);
  });

  it('lehnt doppelte Sitzplatz-IDs ab', () => {
    const sitz = erzeugeSitzplaetze(einzeltisch)[0];
    const parsed = RaumDokumentV3Schema.safeParse({
      ...basis,
      objekte: [einzeltisch],
      sitzplaetze: [sitz, { ...sitz }],
    });
    expect(parsed.success).toBe(false);
  });

  it('erzwingt die kanonische Sitzplatzmenge: Tisch ohne Sitzplätze wird abgelehnt', () => {
    // Persistierter V3-Stand mit Tisch, aber leerer Sitzplatzliste — darf
    // nicht als gültig durchgehen (Codex-Finding PR #81).
    const parsed = RaumDokumentV3Schema.safeParse({
      ...basis,
      objekte: [einzeltisch],
      sitzplaetze: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('erzwingt die kanonische Sitzplatzmenge: frei erfundene Anker oder IDs werden abgelehnt', () => {
    const abweichenderAnker = RaumDokumentV3Schema.safeParse({
      ...basis,
      objekte: [einzeltisch],
      sitzplaetze: [{ id: 'obj_t1__sitz_1', objektId: 'obj_t1', lokalX_cm: 10, lokalY_cm: 10 }],
    });
    expect(abweichenderAnker.success).toBe(false);

    const abweichendeId = RaumDokumentV3Schema.safeParse({
      ...basis,
      objekte: [einzeltisch],
      sitzplaetze: [{ id: 'frei_erfunden', objektId: 'obj_t1', lokalX_cm: 30, lokalY_cm: 50 }],
    });
    expect(abweichendeId.success).toBe(false);

    // Die optionale Bezeichnung bleibt frei wählbar
    const eigeneBezeichnung = RaumDokumentV3Schema.safeParse({
      ...basis,
      objekte: [einzeltisch],
      sitzplaetze: [{ id: 'obj_t1__sitz_1', objektId: 'obj_t1', lokalX_cm: 30, lokalY_cm: 50, bezeichnung: 'Fensterplatz' }],
    });
    expect(eigeneBezeichnung.success).toBe(true);
  });
});

describe('Sitzplatz-Hilfsfunktionen: Duplikat und Delete-Scope', () => {
  it('dupliziert Sitzplätze mit vollständig disjunkten IDs', () => {
    const original = erzeugeSitzplaetze(doppeltisch);
    const kopie = dupliziereSitzplaetze(original, doppeltisch.id, 'obj_neu');
    expect(kopie).toHaveLength(2);
    expect(kopie.map((s) => s.objektId)).toEqual(['obj_neu', 'obj_neu']);
    const schnitt = kopie.filter((k) => original.some((o) => o.id === k.id));
    expect(schnitt).toEqual([]);
    // Lokale Anker bleiben identisch
    expect(kopie.map((s) => [s.lokalX_cm, s.lokalY_cm])).toEqual(
      original.map((s) => [s.lokalX_cm, s.lokalY_cm]),
    );
  });

  it('entfernt genau die Sitzplätze des gelöschten Objekts', () => {
    const alle = [...erzeugeSitzplaetze(einzeltisch), ...erzeugeSitzplaetze(doppeltisch)];
    const rest = entferneSitzplaetzeVon(alle, einzeltisch.id);
    expect(rest.map((s) => s.objektId)).toEqual([doppeltisch.id, doppeltisch.id]);
    expect(alle).toHaveLength(3); // Originalliste unverändert
  });
});

describe('RaumService: Sitzplätze atomar mit Objektaktionen (M2 #54)', () => {
  let repo: InMemoryRaumRepository;
  let service: RaumService;

  beforeEach(() => {
    repo = new InMemoryRaumRepository();
    service = new RaumService(repo);
  });

  const gueltig = { name: 'Raum', breiteCm: 800, laengeCm: 600, rasterCm: 50 };

  it('erzeugt Sitzplätze atomar mit dem Tisch und lässt andere Objekte ohne', async () => {
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_double' });
    expect(dok(mit).sitzplaetze).toHaveLength(2);
    expect(dok(mit).sitzplaetze.every((s) => s.objektId === dok(mit).objekte[0].id)).toBe(true);

    const mitPult = await service.addObjekt('u1', r.id, { typ: 'teacher_desk' });
    expect(dok(mitPult).sitzplaetze).toHaveLength(2); // unverändert
    expect(dok(mitPult).sitzplaetze.some((s) => s.objektId === dok(mitPult).objekte[1].id)).toBe(false);
  });

  it('Property: Verschieben und Drehen bewahren Sitzplatz-IDs und Anker', async () => {
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_double' });
    const idsVorher = dok(mit).sitzplaetze.map((s) => s.id);
    const ankerVorher = dok(mit).sitzplaetze.map((s) => [s.lokalX_cm, s.lokalY_cm]);
    const tischId = dok(mit).objekte[0].id;

    // Mehrfach bewegen und vier Mal drehen (volle Runde)
    await service.bewegeObjekt('u1', r.id, tischId, { x_cm: 333, y_cm: 111 });
    await service.rotiereObjekt('u1', r.id, tischId);
    await service.rotiereObjekt('u1', r.id, tischId);
    await service.rotiereObjekt('u1', r.id, tischId);
    await service.rotiereObjekt('u1', r.id, tischId);
    await service.bewegeObjekt('u1', r.id, tischId, { x_cm: 10, y_cm: 20 });

    const ende = await service.getById('u1', r.id);
    expect(dok(ende).sitzplaetze.map((s) => s.id)).toEqual(idsVorher);
    expect(dok(ende).sitzplaetze.map((s) => [s.lokalX_cm, s.lokalY_cm])).toEqual(ankerVorher);
  });

  it('Property: Duplizieren erzeugt vollständig disjunkte Tisch- und Sitzplatz-IDs', async () => {
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_double' });
    const original = dok(mit).objekte[0];

    const dupStand = await service.dupliziereObjekt('u1', r.id, original.id);
    const dup = dok(dupStand);
    expect(dup.objekte).toHaveLength(2);
    expect(dup.sitzplaetze).toHaveLength(4);

    const kopie = dup.objekte.find((o) => o.id !== original.id)!;
    const originalSitzIds = new Set(
      dup.sitzplaetze.filter((s) => s.objektId === original.id).map((s) => s.id),
    );
    const kopieSitze = dup.sitzplaetze.filter((s) => s.objektId === kopie.id);
    expect(kopieSitze).toHaveLength(2);
    expect(kopieSitze.every((s) => !originalSitzIds.has(s.id))).toBe(true);
    // Alle Sitzplatz-IDs dokumentweit eindeutig
    expect(new Set(dup.sitzplaetze.map((s) => s.id)).size).toBe(4);
  });

  it('löscht Sitzplätze atomar mit dem Parent-Tisch im selben Command', async () => {
    const r = await service.create('u1', gueltig);
    await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_double' });
    const [erster, zweiter] = dok(mit).objekte;

    const geloescht = dok(await service.entferneObjekt('u1', r.id, zweiter.id));
    expect(geloescht.objekte).toHaveLength(1);
    expect(geloescht.sitzplaetze).toHaveLength(1);
    expect(geloescht.sitzplaetze[0].objektId).toBe(erster.id);
    // Kein verwaister Sitzplatz verweist auf das gelöschte Objekt
    expect(geloescht.sitzplaetze.some((s) => s.objektId === zweiter.id)).toBe(false);
  });

  it('Reload-Test: Einzel- und Doppeltisch behalten IDs und Positionen nach erneutem Laden', async () => {
    const r = await service.create('u1', gueltig);
    await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_double' });
    await service.rotiereObjekt('u1', r.id, dok(mit).objekte[1].id);
    const vorher = dok(await service.getById('u1', r.id));

    // Reload-Simulation: frische Service-Instanz auf demselben Repository
    const reload = dok(await new RaumService(repo).getById('u1', r.id));
    expect(reload.sitzplaetze).toEqual(vorher.sitzplaetze);
    expect(reload.objekte).toEqual(vorher.objekte);
    // Weltpositionen bleiben identisch berechenbar
    const tisch = reload.objekte[1];
    const sitz = reload.sitzplaetze.find((s) => s.objektId === tisch.id)!;
    expect(sitzplatzWeltPosition(sitz, tisch)).toEqual(
      sitzplatzWeltPosition(vorher.sitzplaetze.find((s) => s.id === sitz.id)!, tisch),
    );
  });
});
