import { describe, it, expect } from 'vitest';
import {
  BewegeObjektInputSchema,
  bewegeObjektAufRaster,
  rundeAufRaster,
} from '../../src/domain/raum/interaktion';
import { istObjektImRaum } from '../../src/domain/raum/objekte';
import type { RaumObjektV1 } from '../../src/domain/raum/objekte';

describe('Rasterfang (M2 #52)', () => {
  it('rundet auf das nächste Rastervielfache', () => {
    expect(rundeAufRaster(0, 50)).toBe(0);
    expect(rundeAufRaster(24, 50)).toBe(0);
    expect(rundeAufRaster(25, 50)).toBe(50);
    expect(rundeAufRaster(76, 50)).toBe(100);
    expect(rundeAufRaster(-30, 50)).toBe(-50);
  });

  it('ist idempotent (Property)', () => {
    const werte = [0, 12.3, 50, 51, 99.9, 100, -40, 137.777, 9999.01];
    const raster = [1, 10, 25, 50, 100];
    for (const v of werte) {
      for (const r of raster) {
        const einmal = rundeAufRaster(v, r);
        expect(rundeAufRaster(einmal, r)).toBe(einmal);
        expect(einmal % r).toBeCloseTo(0, 6);
      }
    }
  });

  it('lehnt ungültige Eingaben ab', () => {
    expect(() => rundeAufRaster(Number.NaN, 50)).toThrow();
    expect(() => rundeAufRaster(10, 0)).toThrow();
    expect(BewegeObjektInputSchema.safeParse({ x_cm: 1, y_cm: 2 }).success).toBe(true);
    expect(BewegeObjektInputSchema.safeParse({ x_cm: Number.POSITIVE_INFINITY, y_cm: 2 }).success).toBe(false);
    expect(BewegeObjektInputSchema.safeParse({ x_cm: 'links', y_cm: 2 }).success).toBe(false);
  });
});

describe('Bewegung mit Rasterfang und Raumgrenzen (M2 #52)', () => {
  const tisch: RaumObjektV1 = {
    id: 'obj_1',
    typ: 'table_single',
    x_cm: 100,
    y_cm: 100,
    breite_cm: 60,
    tiefe_cm: 50,
    rotation_deg: 0,
  };

  it('rastet die Zielposition ein und bleibt im Raum', () => {
    const ziel = bewegeObjektAufRaster(tisch, 137, 249, 50, 800, 600);
    expect(ziel).toEqual({ x_cm: 150, y_cm: 250 });
  });

  it('klemmt Positionen jenseits der Raumgrenzen auf den letzten gültigen Punkt (Property)', () => {
    const wuensche: Array<[number, number]> = [
      [-500, -500],
      [-1, 0],
      [800, 600],
      [10000, 10000],
      [739.9, 549.9],
    ];
    for (const [wx, wy] of wuensche) {
      const ziel = bewegeObjektAufRaster(tisch, wx, wy, 50, 800, 600);
      const bewegt = { ...tisch, ...ziel };
      expect(istObjektImRaum(bewegt, 800, 600)).toBe(true);
    }
  });

  it('hält rotierte Objekte an allen Raumgrenzen im Raum (Property)', () => {
    const pult90: RaumObjektV1 = {
      id: 'obj_2',
      typ: 'teacher_desk',
      x_cm: 200,
      y_cm: 200,
      breite_cm: 160,
      tiefe_cm: 80,
      rotation_deg: 90,
    };
    const wuensche: Array<[number, number]> = [
      [-300, -300],
      [0, 0],
      [800, 600],
      [10000, -10000],
      [45.2, 512.8],
    ];
    for (const [wx, wy] of wuensche) {
      const ziel = bewegeObjektAufRaster(pult90, wx, wy, 50, 800, 600);
      const bewegt = { ...pult90, ...ziel };
      expect(istObjektImRaum(bewegt, 800, 600)).toBe(true);
    }
  });

  it('rundet trotz Begrenzung weiterhin auf das Raster', () => {
    const ziel = bewegeObjektAufRaster(tisch, 137, 249, 50, 800, 600);
    expect(ziel.x_cm % 50).toBeCloseTo(0, 6);
    expect(ziel.y_cm % 50).toBeCloseTo(0, 6);
  });

  it('wählt beim Klemmen den nächsten gültigen Rasterpunkt im Intervall', () => {
    // 60 cm Tisch in 800 cm Raum: letzte gültige x-Position wäre 740,
    // ist aber kein Rastervielfaches — es wird auf 700 geklemmt.
    const ziel = bewegeObjektAufRaster(tisch, 99999, 0, 50, 800, 600);
    expect(ziel.x_cm).toBe(700);
    expect(ziel.x_cm % 50).toBeCloseTo(0, 6);

    // Unterlauf: kleinstes Rastervielfaches ≥ 0 ist 0.
    const links = bewegeObjektAufRaster(tisch, -99999, 0, 50, 800, 600);
    expect(links.x_cm).toBe(0);
  });

  it('hält auch geklemmte Positionen auf dem Raster (Property)', () => {
    const wuensche: Array<[number, number]> = [
      [-500, -500],
      [10000, 10000],
      [739.9, 549.9],
      [137, 249],
    ];
    for (const [wx, wy] of wuensche) {
      const ziel = bewegeObjektAufRaster(tisch, wx, wy, 50, 800, 600);
      expect(ziel.x_cm % 50).toBeCloseTo(0, 6);
      expect(ziel.y_cm % 50).toBeCloseTo(0, 6);
      expect(istObjektImRaum({ ...tisch, ...ziel }, 800, 600)).toBe(true);
    }
  });
});
