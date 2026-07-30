import { describe, it, expect } from 'vitest';
import {
  RAUM_OBJEKT_TYPEN,
  STANDARD_OBJEKTE,
  RaumObjektV1Schema,
  AddRaumObjektInputSchema,
  effektiveMasse,
  istObjektImRaum,
  objektGrenzen,
  startPosition,
} from '../../src/domain/raum/objekte';
import {
  AKTUELLE_DOKUMENT_VERSION,
  RaumDokumentV1Schema,
  RaumDokumentV2Schema,
  RaumDokumentSchema,
  migriereRaumDokument,
} from '../../src/domain/raum/raum';
import type { RaumObjektV1 } from '../../src/domain/raum/objekte';

describe('RaumObjektV1-Vertrag (M2 #51)', () => {
  const basis = { id: 'obj_1', x_cm: 10, y_cm: 20, breite_cm: 60, tiefe_cm: 50, rotation_deg: 0 };

  it('akzeptiert alle sechs Standardobjektarten als diskriminierte Union', () => {
    for (const typ of RAUM_OBJEKT_TYPEN) {
      const parsed = RaumObjektV1Schema.safeParse({ ...basis, typ });
      expect(parsed.success).toBe(true);
    }
  });

  it('lehnt einen unbekannten Objekttyp ab', () => {
    const parsed = RaumObjektV1Schema.safeParse({ ...basis, typ: 'spaceship' });
    expect(parsed.success).toBe(false);
  });

  it('lehnt ungültige Maße und Rotationen ab', () => {
    expect(RaumObjektV1Schema.safeParse({ ...basis, typ: 'board', breite_cm: 0 }).success).toBe(false);
    expect(RaumObjektV1Schema.safeParse({ ...basis, typ: 'board', tiefe_cm: -5 }).success).toBe(false);
    expect(RaumObjektV1Schema.safeParse({ ...basis, typ: 'board', x_cm: -1 }).success).toBe(false);
    expect(RaumObjektV1Schema.safeParse({ ...basis, typ: 'board', rotation_deg: 360 }).success).toBe(false);
    expect(RaumObjektV1Schema.safeParse({ ...basis, typ: 'board', rotation_deg: Number.NaN }).success).toBe(false);
  });

  it('definiert positive Standardmaße für alle Objektarten', () => {
    for (const typ of RAUM_OBJEKT_TYPEN) {
      const std = STANDARD_OBJEKTE[typ];
      expect(std.breiteCm).toBeGreaterThan(0);
      expect(std.tiefeCm).toBeGreaterThan(0);
      expect(std.rotationDeg).toBeGreaterThanOrEqual(0);
      expect(std.rotationDeg).toBeLessThan(360);
      expect(std.label.length).toBeGreaterThan(0);
    }
  });

  it('validiert AddRaumObjektInput und lehnt unbekannte Typen ab', () => {
    expect(AddRaumObjektInputSchema.safeParse({ typ: 'table_single' }).success).toBe(true);
    expect(AddRaumObjektInputSchema.safeParse({ typ: 'unknown' }).success).toBe(false);
    expect(AddRaumObjektInputSchema.safeParse({}).success).toBe(false);
  });
});

describe('Startpositionen und Raumgrenzen (M2 #51)', () => {
  it('legt jede Objektart vollständig in den Raum (Property über Raumgrößen)', () => {
    const raeume: Array<[number, number]> = [
      [800, 600],
      [1200, 900],
      [2000, 1500],
      [500, 400], // kleiner Raum: Tafel muss geklemmt werden
    ];
    for (const [b, l] of raeume) {
      for (const typ of RAUM_OBJEKT_TYPEN) {
        const std = STANDARD_OBJEKTE[typ];
        // Objekte, die breiter als der Raum sind, können nicht vollständig
        // hineinpassen — diese Kombination lehnt der Dokumentvertrag ab.
        if (std.breiteCm > b || std.tiefeCm > l) continue;
        const pos = startPosition(typ, b, l);
        const objekt: RaumObjektV1 = {
          id: `obj_${typ}`,
          typ,
          x_cm: pos.x_cm,
          y_cm: pos.y_cm,
          breite_cm: std.breiteCm,
          tiefe_cm: std.tiefeCm,
          rotation_deg: std.rotationDeg,
        };
        expect(istObjektImRaum(objekt, b, l)).toBe(true);
      }
    }
  });

  it('klemmt zu große Ankerpositionen an die Raumgrenze', () => {
    // 400-cm-Tafel in 300-cm-Raum: x wird auf 0 geklemmt.
    const pos = startPosition('board', 300, 600);
    expect(pos.x_cm).toBe(0);
    expect(pos.y_cm).toBe(0);
  });

  it('tauscht Breite und Tiefe bei 90°/270°-Rotation', () => {
    const o = { id: 'o', typ: 'table_single', x_cm: 0, y_cm: 0, breite_cm: 60, tiefe_cm: 50 } as const;
    expect(effektiveMasse({ ...o, rotation_deg: 0 })).toEqual({ breiteCm: 60, tiefeCm: 50 });
    expect(effektiveMasse({ ...o, rotation_deg: 90 })).toEqual({ breiteCm: 50, tiefeCm: 60 });
    expect(effektiveMasse({ ...o, rotation_deg: 180 })).toEqual({ breiteCm: 60, tiefeCm: 50 });
    expect(effektiveMasse({ ...o, rotation_deg: 270 })).toEqual({ breiteCm: 50, tiefeCm: 60 });
  });

  it('bildet die gerenderten Grenzen bei Mittelpunktsrotation exakt ab', () => {
    const o = { id: 'o', typ: 'teacher_desk', x_cm: 100, y_cm: 100, breite_cm: 160, tiefe_cm: 80, rotation_deg: 90 } as const;
    const g = objektGrenzen(o);
    // Mittelpunkt (180,140); bei 90° werden die Halbachsen getauscht: ±40/±80
    expect(g.minX).toBeCloseTo(140, 9);
    expect(g.maxX).toBeCloseTo(220, 9);
    expect(g.minY).toBeCloseTo(60, 9);
    expect(g.maxY).toBeCloseTo(220, 9);
    expect(istObjektImRaum(o, 800, 600)).toBe(true);
    expect(istObjektImRaum({ ...o, x_cm: 0, y_cm: 0 }, 800, 600)).toBe(false);
  });

  it('verankert Fenster flach an der linken Wand (Tiefe entlang der Wand)', () => {
    expect(STANDARD_OBJEKTE.window.breiteCm).toBe(15);
    expect(STANDARD_OBJEKTE.window.tiefeCm).toBe(180);
    expect(STANDARD_OBJEKTE.window.rotationDeg).toBe(0);
    const pos = startPosition('window', 800, 600);
    expect(pos.x_cm).toBe(0);
    expect(pos.y_cm).toBe(210); // vertikal zentriert
  });
});

describe('RaumDokumentV2 mit Objekten (M2 #51)', () => {
  const doc = { version: 2 as const, breiteCm: 800, laengeCm: 600, rasterCm: 50 };

  it('nimmt Dokumente mit gültigen Objekten an', () => {
    const parsed = RaumDokumentV2Schema.safeParse({
      ...doc,
      objekte: [
        { id: 'obj_1', typ: 'teacher_desk', x_cm: 100, y_cm: 55, breite_cm: 160, tiefe_cm: 80, rotation_deg: 0 },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('lehnt Dokumente mit Objekten außerhalb der Raumgrenzen ab', () => {
    const parsed = RaumDokumentV2Schema.safeParse({
      ...doc,
      objekte: [
        { id: 'obj_1', typ: 'board', x_cm: 500, y_cm: 0, breite_cm: 400, tiefe_cm: 15, rotation_deg: 0 },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it('lehnt rotierte Objekte ab, deren gerenderte Grenzen den Raum überschreiten', () => {
    // 160×80 an (0,0) mit 90° um den Mittelpunkt rotiert ragt 40 cm über den
    // oberen/linken Rand hinaus — obwohl x_cm/y_cm selbst gültig sind.
    const parsed = RaumDokumentV2Schema.safeParse({
      ...doc,
      objekte: [
        { id: 'obj_1', typ: 'teacher_desk', x_cm: 0, y_cm: 0, breite_cm: 160, tiefe_cm: 80, rotation_deg: 90 },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it('akzeptiert rotierte Objekte, deren gerenderte Grenzen im Raum liegen', () => {
    const parsed = RaumDokumentV2Schema.safeParse({
      ...doc,
      objekte: [
        { id: 'obj_1', typ: 'teacher_desk', x_cm: 140, y_cm: 140, breite_cm: 160, tiefe_cm: 80, rotation_deg: 90 },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('lehnt doppelte Objekt-IDs im selben Dokument ab', () => {
    const tisch = { id: 'obj_1', typ: 'table_single', x_cm: 0, y_cm: 0, breite_cm: 60, tiefe_cm: 50, rotation_deg: 0 };
    const parsed = RaumDokumentV2Schema.safeParse({ ...doc, objekte: [tisch, { ...tisch }] });
    expect(parsed.success).toBe(false);
  });
});

describe('Dokumentversionierung und Migration (ADR-0003, M2 #51)', () => {
  const v1Doc = { version: 1 as const, breiteCm: 800, laengeCm: 600, rasterCm: 50, objekte: [] };

  it('liest weiterhin V1-Bestandsdokumente (leere Objektliste)', () => {
    expect(RaumDokumentV1Schema.safeParse(v1Doc).success).toBe(true);
    expect(RaumDokumentSchema.safeParse(v1Doc).success).toBe(true);
  });

  it('lehnt V1-Dokumente mit nicht-leeren Objekten ab', () => {
    const parsed = RaumDokumentSchema.safeParse({
      ...v1Doc,
      objekte: [{ id: 'x', typ: 'board', x_cm: 0, y_cm: 0, breite_cm: 400, tiefe_cm: 15, rotation_deg: 0 }],
    });
    expect(parsed.success).toBe(false);
  });

  it('migriert V1 validiert nach V2 und belässt V2 unverändert', () => {
    const migriert = migriereRaumDokument(RaumDokumentSchema.parse(v1Doc));
    expect(migriert.version).toBe(AKTUELLE_DOKUMENT_VERSION);
    expect(migriert.objekte).toEqual([]);
    expect(migriert.breiteCm).toBe(800);

    const v2 = RaumDokumentV2Schema.parse({ ...v1Doc, version: 2 });
    expect(migriereRaumDokument(v2)).toEqual(v2);
  });
});
