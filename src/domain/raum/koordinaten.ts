// Framework-freie Koordinatentransformation für den Raum-Canvas (M2 #50).
// Fachliche Geometrie bleibt in Zentimetern; Pixelwerte existieren
// ausschließlich für die Darstellung (ADR-0002).

/** Praktikable Untergrenze des Rasters — gilt für Vertrag und Darstellung gleichermaßen. */
export const MIN_RASTER_CM = 1;

/** Harte Obergrenze gerenderter Rasterlinien als Schutz vor CPU-/Speicherüberlauf. */
export const MAX_RASTER_LINIEN = 2000;

export interface Massstab {
  /** Pixel pro Zentimeter */
  pxProCm: number;
  /** Stage-Breite in Pixeln */
  breitePx: number;
  /** Stage-Höhe in Pixeln */
  hoehePx: number;
}

/**
 * Berechnet den Darstellungsmaßstab so, dass der Raum vollständig in die
 * verfügbare Fläche passt. Das Seitenverhältnis breiteCm : laengeCm bleibt
 * exakt erhalten — beide Achsen teilen denselben Faktor.
 */
export function berechneMassstab(
  breiteCm: number,
  laengeCm: number,
  maxBreitePx: number,
  maxHoehePx: number,
): Massstab {
  if (breiteCm <= 0 || laengeCm <= 0) {
    throw new Error('Raummaße müssen positiv sein.');
  }
  if (maxBreitePx <= 0 || maxHoehePx <= 0) {
    throw new Error('Darstellungsfläche muss positiv sein.');
  }
  const pxProCm = Math.min(maxBreitePx / breiteCm, maxHoehePx / laengeCm);
  return {
    pxProCm,
    breitePx: breiteCm * pxProCm,
    hoehePx: laengeCm * pxProCm,
  };
}

export function cmToPx(cm: number, pxProCm: number): number {
  return cm * pxProCm;
}

export function pxToCm(px: number, pxProCm: number): number {
  return px / pxProCm;
}

export interface RasterLinien {
  /** x-Positionen vertikaler Linien in cm (ohne Raumgrenzen 0 und breiteCm) */
  vertikal: number[];
  /** y-Positionen horizontaler Linien in cm (ohne Raumgrenzen 0 und laengeCm) */
  horizontal: number[];
}

/**
 * Rasterlinien im Abstand rasterCm. Raumgrenzen werden separat gezeichnet,
 * daher nur innere Linien. Die letzte Linie liegt immer < Raumseite — es
 * entsteht kein Phantom-Raster jenseits der Grenze.
 */
export function rasterLinien(breiteCm: number, laengeCm: number, rasterCm: number): RasterLinien {
  if (!Number.isFinite(rasterCm)) {
    throw new Error('Raster muss eine endliche Zahl sein.');
  }
  if (rasterCm < MIN_RASTER_CM) {
    throw new Error(`Raster muss mindestens ${MIN_RASTER_CM} cm betragen.`);
  }
  const vertikal: number[] = [];
  for (let x = rasterCm; x < breiteCm; x += rasterCm) {
    vertikal.push(x);
  }
  const horizontal: number[] = [];
  for (let y = rasterCm; y < laengeCm; y += rasterCm) {
    horizontal.push(y);
  }
  if (vertikal.length + horizontal.length > MAX_RASTER_LINIEN) {
    throw new Error(
      `Raster erzeugt mehr als ${MAX_RASTER_LINIEN} Linien und würde die Darstellung überlasten.`,
    );
  }
  return { vertikal, horizontal };
}
