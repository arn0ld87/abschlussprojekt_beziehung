import { describe, it, expect } from 'vitest';
import { berechneMassstab, cmToPx, pxToCm, rasterLinien } from '../../src/domain/raum/koordinaten';

describe('Koordinatentransformation (M2 #50)', () => {
  it('berechnet Maßstab mit exaktem Seitenverhältnis bei Breiten-Limit', () => {
    const m = berechneMassstab(800, 600, 400, 1000);
    // Breite limitiert: 400/800 = 0.5
    expect(m.pxProCm).toBeCloseTo(0.5, 10);
    expect(m.breitePx).toBeCloseTo(400, 10);
    expect(m.hoehePx).toBeCloseTo(300, 10);
    expect(m.breitePx / m.hoehePx).toBeCloseTo(800 / 600, 10);
  });

  it('berechnet Maßstab mit exaktem Seitenverhältnis bei Höhen-Limit', () => {
    const m = berechneMassstab(800, 600, 10000, 300);
    // Höhe limitiert: 300/600 = 0.5
    expect(m.pxProCm).toBeCloseTo(0.5, 10);
    expect(m.hoehePx).toBeCloseTo(300, 10);
    expect(m.breitePx).toBeCloseTo(400, 10);
  });

  it('skaliert kleine Räume hoch und große Räume herunter, ohne das Verhältnis zu brechen', () => {
    const klein = berechneMassstab(120, 90, 720, 520);
    expect(klein.breitePx).toBeLessThanOrEqual(720);
    expect(klein.hoehePx).toBeLessThanOrEqual(520);
    expect(klein.breitePx / klein.hoehePx).toBeCloseTo(120 / 90, 6);

    const gross = berechneMassstab(2000, 1500, 720, 520);
    expect(gross.breitePx).toBeLessThanOrEqual(720);
    expect(gross.hoehePx).toBeLessThanOrEqual(520);
    expect(gross.breitePx / gross.hoehePx).toBeCloseTo(2000 / 1500, 6);
  });

  it('lehnt nicht-positive Eingaben ab', () => {
    expect(() => berechneMassstab(0, 600, 400, 400)).toThrow();
    expect(() => berechneMassstab(800, -1, 400, 400)).toThrow();
    expect(() => berechneMassstab(800, 600, 0, 400)).toThrow();
    expect(() => rasterLinien(800, 600, 0)).toThrow();
  });

  it('lehnt zu feines und unendliches Raster ab (Regression: Rasterdichte-Begrenzung)', () => {
    expect(() => rasterLinien(800, 600, 0.01)).toThrow(/mindestens 1 cm/);
    expect(() => rasterLinien(800, 600, Number.POSITIVE_INFINITY)).toThrow(/endliche Zahl/);
    expect(() => rasterLinien(800, 600, Number.NaN)).toThrow(/endliche Zahl/);
  });

  it('begrenzt die Gesamtzahl der Rasterlinien', () => {
    // 1 cm Raster auf 5000x5000 cm würde ~10.000 Linien erzeugen.
    expect(() => rasterLinien(5000, 5000, 1)).toThrow(/2000 Linien/);
  });

  it('cm→px→cm ist innerhalb der Rundungstoleranz identisch (Property)', () => {
    const massstaebe = [0.1, 0.3333, 0.5, 0.8667, 1, 2.5, 6];
    const werte = [0.5, 1, 12.5, 50, 137.9, 600, 2000];
    for (const s of massstaebe) {
      for (const cm of werte) {
        expect(pxToCm(cmToPx(cm, s), s)).toBeCloseTo(cm, 9);
      }
    }
  });

  it('Rasterlinien treffen stabile Grenzen exakt', () => {
    const l = rasterLinien(800, 600, 50);
    expect(l.vertikal).toHaveLength(15); // 50..750
    expect(l.horizontal).toHaveLength(11); // 50..550
    expect(l.vertikal[0]).toBe(50);
    expect(l.vertikal[l.vertikal.length - 1]).toBe(750);
    expect(l.horizontal[l.horizontal.length - 1]).toBe(550);
  });

  it('erzeugt keine Linie auf oder jenseits der Raumgrenze', () => {
    const l = rasterLinien(100, 100, 50);
    expect(l.vertikal).toEqual([50]);
    expect(l.horizontal).toEqual([50]);

    const keine = rasterLinien(40, 30, 50);
    expect(keine.vertikal).toEqual([]);
    expect(keine.horizontal).toEqual([]);
  });

  it('Rasterlinien sind immer Vielfache des Rasters und aufsteigend (Property)', () => {
    const faelle: Array<[number, number, number]> = [
      [800, 600, 50],
      [137, 91, 12.5],
      [2000, 1500, 100],
      [55, 44, 7],
    ];
    for (const [b, l, r] of faelle) {
      const { vertikal, horizontal } = rasterLinien(b, l, r);
      for (const x of vertikal) {
        expect(x % r).toBeCloseTo(0, 9);
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(b);
      }
      for (const y of horizontal) {
        expect(y % r).toBeCloseTo(0, 9);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(l);
      }
      expect([...vertikal].sort((a, z) => a - z)).toEqual(vertikal);
      expect([...horizontal].sort((a, z) => a - z)).toEqual(horizontal);
    }
  });
});
