import { z } from 'zod';
import { objektGrenzen, RaumObjektV1 } from './objekte';

// Reine, framework-freie Funktionen für die Objektinteraktion (M2 #52):
// Rasterfang und Raumgrenzen-Begrenzung ausschließlich in Zentimetern.
// Die Darstellung (Konva) ruft diese Funktionen niemals mit Pixelwerten auf.

/** Input-Vertrag für das Verschieben eines Objekts. */
export const BewegeObjektInputSchema = z.object({
  x_cm: z
    .number({ invalid_type_error: 'x_cm muss eine Zahl sein.' })
    .finite('x_cm muss endlich sein.'),
  y_cm: z
    .number({ invalid_type_error: 'y_cm muss eine Zahl sein.' })
    .finite('y_cm muss endlich sein.'),
});

export type BewegeObjektInput = z.infer<typeof BewegeObjektInputSchema>;

/**
 * Rundet einen Zentimeterwert auf das nächste Rastervielfache.
 * Idempotent: rundeAufRaster(rundeAufRaster(v)) === rundeAufRaster(v).
 */
export function rundeAufRaster(wertCm: number, rasterCm: number): number {
  if (!Number.isFinite(wertCm)) {
    throw new Error('Wert muss eine endliche Zahl sein.');
  }
  if (rasterCm <= 0) {
    throw new Error('Raster muss positiv sein.');
  }
  const gerundet = Math.round(wertCm / rasterCm) * rasterCm;
  // Gleitkomma-Artefakte (z. B. 0.1+0.2-ähnliche Reste) kappen; +0 normalisiert -0
  return Math.round(gerundet * 1e9) / 1e9 + 0;
}

function klemmeWert(wert: number, min: number, max: number): number {
  return Math.min(Math.max(wert, min), max);
}

/**
 * Begrenzt einen gerundeten Rasterwert auf [min, max] und wählt dabei den
 * nächsten *gültigen Rasterpunkt* im Intervall: Unterlauf → kleinstes
 * Rastervielfaches ≥ min, Überlauf → größtes Rastervielfaches ≤ max. Nur
 * wenn das Intervall keinen Rasterpunkt enthält (degenerierte Fälle, z. B.
 * rotierte Objekte in sehr kleinen Räumen), wird auf die Intervallgrenze
 * selbst geklemmt — der Dokumentvertrag fängt diese Fälle ab.
 */
export function klemmeAufRaster(gerundet: number, min: number, max: number, rasterCm: number): number {
  if (min > max) {
    return klemmeWert(gerundet, max, min);
  }
  const eps = 1e-9;
  if (gerundet < min) {
    const kandidat = rundeAufRaster(Math.ceil((min - eps) / rasterCm) * rasterCm, rasterCm);
    return kandidat <= max + eps ? kandidat : min;
  }
  if (gerundet > max) {
    const kandidat = rundeAufRaster(Math.floor((max + eps) / rasterCm) * rasterCm, rasterCm);
    return kandidat >= min - eps ? kandidat : max;
  }
  return gerundet;
}

/**
 * Berechnet die Zielposition eines Objekts nach einer Bewegung: Die
 * Wunschposition (linke obere Ecke des unrotierten Rechtecks) wird auf das
 * Raster gerundet und so begrenzt, dass die tatsächlich gerenderte
 * Bounding-Box (Mittelpunktsrotation, siehe objektGrenzen) vollständig im
 * Raum bleibt.
 */
export function bewegeObjektAufRaster(
  objekt: RaumObjektV1,
  wunschXCm: number,
  wunschYCm: number,
  rasterCm: number,
  raumBreiteCm: number,
  raumLaengeCm: number,
): { x_cm: number; y_cm: number } {
  const gerundetX = rundeAufRaster(wunschXCm, rasterCm);
  const gerundetY = rundeAufRaster(wunschYCm, rasterCm);

  // Offset der Bounding-Box relativ zur unrotierten linken oberen Ecke —
  // bei Rotation um den Mittelpunkt ragt die Box auf allen Seiten anders über.
  const g = objektGrenzen(objekt);
  const offsetMinX = g.minX - objekt.x_cm;
  const offsetMinY = g.minY - objekt.y_cm;
  const offsetMaxX = g.maxX - objekt.x_cm;
  const offsetMaxY = g.maxY - objekt.y_cm;

  const minX = -offsetMinX;
  const maxX = raumBreiteCm - offsetMaxX;
  const minY = -offsetMinY;
  const maxY = raumLaengeCm - offsetMaxY;

  return {
    x_cm: klemmeAufRaster(gerundetX, minX, maxX, rasterCm),
    y_cm: klemmeAufRaster(gerundetY, minY, maxY, rasterCm),
  };
}
