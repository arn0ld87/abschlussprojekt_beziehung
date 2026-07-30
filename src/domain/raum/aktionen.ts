import { RaumObjektV1, ueberlapptObjekte } from './objekte';
import { bewegeObjektAufRaster } from './interaktion';

// Framework-freie Objektaktionen (M2 #53): Rotation, Duplizieren und Löschen
// als reine Commands auf dem validierten Dokumentzustand. Keine Konva-,
// React- oder Persistenzlogik — der Service validiert das Ergebnis erneut
// und schreibt es atomar.

/** Normalisiert eine Rotation auf den nächsten 90-Grad-Schritt (0|90|180|270). */
export function normalisiereRotation(rotationDeg: number): 0 | 90 | 180 | 270 {
  const schritte = ((Math.round(rotationDeg / 90) % 4) + 4) % 4;
  return (schritte * 90) as 0 | 90 | 180 | 270;
}

/**
 * Dreht ein Objekt um 90° im Uhrzeigersinn. Position (x_cm/y_cm) bleibt
 * unverändert — die Drehung erfolgt wie im Renderer um den Objektmittelpunkt.
 * Ob das gedrehte Objekt noch in den Raum passt, prüft der Dokumentvertrag
 * (rotationsbereinigte Grenzen); der Service lehnt dann mit VALIDATION_ERROR ab.
 */
export function rotiereObjekt(objekt: RaumObjektV1): RaumObjektV1 {
  const aktuell = normalisiereRotation(objekt.rotation_deg);
  return { ...objekt, rotation_deg: ((aktuell + 90) % 360) as 0 | 90 | 180 | 270 };
}

/**
 * Entfernt genau das Objekt mit der gegebenen ID. Referenzen außerhalb des
 * Objekts existieren im Vertrag nicht (Sitzplätze folgen mit #54).
 */
export function entferneObjekt(objekte: RaumObjektV1[], objektId: string): RaumObjektV1[] {
  return objekte.filter((o) => o.id !== objektId);
}

/**
 * Berechnet die Position eines Duplikats: rasterversetzt (+1 Raster in x
 * und y) und auf eine gültige Position innerhalb der Raumgrenzen geklemmt.
 * Führt der bevorzugte Versatz wegen der Raumgrenze zurück auf die
 * Originalposition oder würde das Duplikat ein bestehendes Objekt
 * überlappen, werden weitere Richtungen probiert. Gibt null zurück, wenn
 * keine freie, vom Original abweichende gültige Position gefunden wird —
 * Duplikate bleiben so sichtbar und einzeln auswählbar.
 */
export function berechneDuplikatPosition(
  objekt: RaumObjektV1,
  bestehende: RaumObjektV1[],
  rasterCm: number,
  raumBreiteCm: number,
  raumLaengeCm: number,
): { x_cm: number; y_cm: number } | null {
  const versatz: Array<[number, number]> = [
    [1, 1],
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [-1, -1],
    [1, -1],
    [-1, 1],
  ];
  for (const [dx, dy] of versatz) {
    const ziel = bewegeObjektAufRaster(
      objekt,
      objekt.x_cm + dx * rasterCm,
      objekt.y_cm + dy * rasterCm,
      rasterCm,
      raumBreiteCm,
      raumLaengeCm,
    );
    if (ziel.x_cm === objekt.x_cm && ziel.y_cm === objekt.y_cm) {
      continue;
    }
    const kandidat: RaumObjektV1 = { ...objekt, x_cm: ziel.x_cm, y_cm: ziel.y_cm };
    if (bestehende.some((o) => ueberlapptObjekte(kandidat, o))) {
      continue;
    }
    return ziel;
  }
  return null;
}
