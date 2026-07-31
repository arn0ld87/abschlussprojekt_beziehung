import { describe, it, expect } from 'vitest';
import {
  berechneDuplikatPosition,
  entferneObjekt,
  normalisiereRotation,
  rotiereObjekt,
} from '../../src/domain/raum/aktionen';
import { istObjektImRaum, ueberlapptObjekte } from '../../src/domain/raum/objekte';
import type { RaumObjektV1 } from '../../src/domain/raum/objekte';

const tisch: RaumObjektV1 = {
  id: 'obj_1',
  typ: 'table_single',
  x_cm: 100,
  y_cm: 100,
  breite_cm: 60,
  tiefe_cm: 50,
  rotation_deg: 0,
};

describe('Rotation (M2 #53)', () => {
  it('normalisiert auf 0|90|180|270', () => {
    expect(normalisiereRotation(0)).toBe(0);
    expect(normalisiereRotation(45)).toBe(90);
    expect(normalisiereRotation(89)).toBe(90);
    expect(normalisiereRotation(270)).toBe(270);
    expect(normalisiereRotation(359)).toBe(0);
    expect(normalisiereRotation(720)).toBe(0);
  });

  it('dreht in 90-Grad-Schritten im Kreis (Property)', () => {
    let o: RaumObjektV1 = tisch;
    const erwartet = [90, 180, 270, 0];
    for (const r of erwartet) {
      o = rotiereObjekt(o);
      expect(o.rotation_deg).toBe(r);
    }
  });

  it('behält Position und Maße beim Drehen (Bounds via Dokumentvertrag)', () => {
    const gedreht = rotiereObjekt(tisch);
    expect(gedreht.x_cm).toBe(tisch.x_cm);
    expect(gedreht.y_cm).toBe(tisch.y_cm);
    expect(gedreht.breite_cm).toBe(tisch.breite_cm);
    expect(gedreht.tiefe_cm).toBe(tisch.tiefe_cm);
    expect(gedreht.id).toBe(tisch.id);
  });
});

describe('Duplizieren (M2 #53)', () => {
  it('findet eine rasterversetzte, gültige Position', () => {
    const ziel = berechneDuplikatPosition(tisch, [tisch], 50, 800, 600);
    expect(ziel).not.toBeNull();
    expect(ziel!.x_cm % 50).toBeCloseTo(0, 6);
    expect(ziel!.y_cm % 50).toBeCloseTo(0, 6);
    expect(ziel).not.toEqual({ x_cm: tisch.x_cm, y_cm: tisch.y_cm });
    expect(istObjektImRaum({ ...tisch, ...ziel! }, 800, 600)).toBe(true);
  });

  it('weicht auf andere Richtungen aus, wenn der bevorzugte Versatz klemmt', () => {
    // Tisch am rechten unteren Rand: +50/+50 klemmt zurück aufs Original.
    const amRand: RaumObjektV1 = { ...tisch, x_cm: 700, y_cm: 550 };
    const ziel = berechneDuplikatPosition(amRand, [amRand], 50, 800, 600);
    expect(ziel).not.toBeNull();
    expect(ziel).not.toEqual({ x_cm: amRand.x_cm, y_cm: amRand.y_cm });
    expect(istObjektImRaum({ ...amRand, ...ziel! }, 800, 600)).toBe(true);
  });

  it('vermeidet Überlappung mit bestehenden Objekten (Codex-Finding PR #80)', () => {
    // Der bevorzugte Platz +50/+50 ist bereits durch ein erstes Duplikat
    // belegt — das zweite Duplikat darf nicht darauf gestapelt werden.
    const erstes: RaumObjektV1 = { ...tisch, id: 'obj_2', x_cm: 150, y_cm: 150 };
    const ziel = berechneDuplikatPosition(tisch, [tisch, erstes], 50, 800, 600);
    expect(ziel).not.toBeNull();
    expect(ziel).not.toEqual({ x_cm: erstes.x_cm, y_cm: erstes.y_cm });
    expect(
      [tisch, erstes].every((o) => !ueberlapptObjekte({ ...tisch, ...ziel! }, o)),
    ).toBe(true);
  });

  it('vermeidet Überlappung mit dem Original bei großen Objekten', () => {
    // 200 cm langes Lehrerpult: der +50-Versatz überlappt das Original weiterhin.
    const regal: RaumObjektV1 = {
      id: 'obj_5',
      typ: 'teacher_desk',
      x_cm: 0,
      y_cm: 0,
      breite_cm: 200,
      tiefe_cm: 40,
      rotation_deg: 0,
    };
    const ziel = berechneDuplikatPosition(regal, [regal], 50, 800, 600);
    expect(ziel).not.toBeNull();
    expect(ueberlapptObjekte({ ...regal, ...ziel! }, regal)).toBe(false);
    expect(istObjektImRaum({ ...regal, ...ziel! }, 800, 600)).toBe(true);
  });

  it('lehnt ab, wenn alle Nachbarpositionen belegt oder außerhalb sind', () => {
    // Original mittig, alle 8 Nachbarpositionen durch gleich große Tische belegt.
    const blocker: RaumObjektV1[] = [
      { ...tisch, id: 'b1', x_cm: 150, y_cm: 150 },
      { ...tisch, id: 'b2', x_cm: 150, y_cm: 100 },
      { ...tisch, id: 'b3', x_cm: 100, y_cm: 150 },
      { ...tisch, id: 'b4', x_cm: 50, y_cm: 100 },
      { ...tisch, id: 'b5', x_cm: 100, y_cm: 50 },
      { ...tisch, id: 'b6', x_cm: 50, y_cm: 50 },
      { ...tisch, id: 'b7', x_cm: 150, y_cm: 50 },
      { ...tisch, id: 'b8', x_cm: 50, y_cm: 150 },
    ];
    expect(berechneDuplikatPosition(tisch, [tisch, ...blocker], 50, 800, 600)).toBeNull();
  });

  it('lehnt ab, wenn das Objekt den Raum ausfüllt und kein Platz frei ist', () => {
    // 400 cm Tafel in exakt 400 cm breitem Raum: jeder Versatz klemmt aufs Original.
    const tafel: RaumObjektV1 = {
      id: 'obj_9',
      typ: 'board',
      x_cm: 0,
      y_cm: 0,
      breite_cm: 400,
      tiefe_cm: 600,
      rotation_deg: 0,
    };
    expect(berechneDuplikatPosition(tafel, [tafel], 50, 400, 600)).toBeNull();
  });
});

describe('Löschen (M2 #53)', () => {
  it('entfernt genau das ausgewählte Objekt (Delete-Scope)', () => {
    const objekte: RaumObjektV1[] = [
      tisch,
      { ...tisch, id: 'obj_2', x_cm: 300 },
      { ...tisch, id: 'obj_3', x_cm: 500 },
    ];
    const rest = entferneObjekt(objekte, 'obj_2');
    expect(rest.map((o) => o.id)).toEqual(['obj_1', 'obj_3']);
    // Originalliste bleibt unverändert
    expect(objekte).toHaveLength(3);
  });

  it('ändert nichts bei unbekannter ID', () => {
    const rest = entferneObjekt([tisch], 'obj_unbekannt');
    expect(rest).toHaveLength(1);
  });
});
