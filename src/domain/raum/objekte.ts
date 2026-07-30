import { z } from 'zod';

// Standardobjekte des MVP-Raumeditors (M2 #51). Fachliche Maße ausschließlich
// in Zentimetern, Rotation in Grad — Pixel existieren nur in der Darstellung
// (ADR-0002). Der Vertrag bleibt framework-frei: keine Konva- oder React-Typen.

export const RAUM_OBJEKT_TYPEN = [
  'table_single',
  'table_double',
  'teacher_desk',
  'board',
  'door',
  'window',
] as const;

export type RaumObjektTyp = (typeof RAUM_OBJEKT_TYPEN)[number];

const gradFeld = z
  .number({ invalid_type_error: 'rotation_deg muss eine Zahl sein.' })
  .finite('rotation_deg muss endlich sein.')
  .min(0, 'rotation_deg muss mindestens 0 sein.')
  .lt(360, 'rotation_deg muss kleiner als 360 sein.');

const objektBasis = z.object({
  id: z.string().min(1),
  x_cm: z.number().finite().min(0, 'x_cm darf nicht negativ sein.'),
  y_cm: z.number().finite().min(0, 'y_cm darf nicht negativ sein.'),
  breite_cm: z.number().finite().positive('breite_cm muss positiv sein.'),
  tiefe_cm: z.number().finite().positive('tiefe_cm muss positiv sein.'),
  rotation_deg: gradFeld,
});

// Diskriminierte Union über die sechs MVP-Objektarten. Unbekannte Typen und
// ungültige Maße werden bereits am Vertrag abgelehnt (stabiler VALIDATION_ERROR).
export const RaumObjektV1Schema = z.discriminatedUnion('typ', [
  objektBasis.extend({ typ: z.literal('table_single') }),
  objektBasis.extend({ typ: z.literal('table_double') }),
  objektBasis.extend({ typ: z.literal('teacher_desk') }),
  objektBasis.extend({ typ: z.literal('board') }),
  objektBasis.extend({ typ: z.literal('door') }),
  objektBasis.extend({ typ: z.literal('window') }),
]);

export type RaumObjektV1 = z.infer<typeof RaumObjektV1Schema>;

export interface StandardObjektDefinition {
  /** Fachliche Bezeichnung für Palette und Darstellung */
  label: string;
  breiteCm: number;
  tiefeCm: number;
  rotationDeg: number;
}

/** Standardmaße der sechs MVP-Objektarten in Zentimetern. */
export const STANDARD_OBJEKTE: Record<RaumObjektTyp, StandardObjektDefinition> = {
  table_single: { label: 'Einzeltisch', breiteCm: 60, tiefeCm: 50, rotationDeg: 0 },
  table_double: { label: 'Doppeltisch', breiteCm: 120, tiefeCm: 50, rotationDeg: 0 },
  teacher_desk: { label: 'Lehrerpult', breiteCm: 160, tiefeCm: 80, rotationDeg: 0 },
  board: { label: 'Tafel', breiteCm: 400, tiefeCm: 15, rotationDeg: 0 },
  door: { label: 'Tür', breiteCm: 90, tiefeCm: 20, rotationDeg: 0 },
  // Fenster liegt an der linken Wand: bei rotation_deg = 0 läuft die Tiefe
  // entlang der Wand (y) und die Breite ragt in den Raum (x).
  window: { label: 'Fenster', breiteCm: 15, tiefeCm: 180, rotationDeg: 0 },
};

export const AddRaumObjektInputSchema = z.object({
  typ: z.enum(RAUM_OBJEKT_TYPEN, {
    errorMap: () => ({ message: 'Unbekannte Objektart.' }),
  }),
});

export type AddRaumObjektInput = z.infer<typeof AddRaumObjektInputSchema>;

function klemmeWert(wert: number, min: number, max: number): number {
  return Math.min(Math.max(wert, min), max);
}

/**
 * Effektive Grundfläche unter Berücksichtigung der Rotation: bei einem
 * ungeraden Vielfachen von 90° tauschen Breite und Tiefe. Freie Winkel sind
 * im MVP nicht vorgesehen; der Vertrag lässt sie zu, die Darstellung rotiert
 * dann um den Objektmittelpunkt.
 */
export function effektiveMasse(objekt: RaumObjektV1): { breiteCm: number; tiefeCm: number } {
  const rot = ((objekt.rotation_deg % 360) + 360) % 360;
  const getauscht = rot % 180 === 90;
  return getauscht
    ? { breiteCm: objekt.tiefe_cm, tiefeCm: objekt.breite_cm }
    : { breiteCm: objekt.breite_cm, tiefeCm: objekt.tiefe_cm };
}

export interface ObjektGrenzen {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Tatsächliche Außenmaße des gerenderten Objekts: Der Renderer (Konva)
 * rotiert um den Mittelpunkt des unrotierten Rechtecks, dessen linke obere
 * Ecke (x_cm, y_cm) ist. Diese Funktion bildet exakt diese Semantik ab —
 * der Vertrag validiert also genau das, was der Canvas zeichnet.
 */
export function objektGrenzen(objekt: RaumObjektV1): ObjektGrenzen {
  const cx = objekt.x_cm + objekt.breite_cm / 2;
  const cy = objekt.y_cm + objekt.tiefe_cm / 2;
  const rad = (objekt.rotation_deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const halbeBreite = (objekt.breite_cm * cos + objekt.tiefe_cm * sin) / 2;
  const halbeTiefe = (objekt.breite_cm * sin + objekt.tiefe_cm * cos) / 2;
  return {
    minX: cx - halbeBreite,
    minY: cy - halbeTiefe,
    maxX: cx + halbeBreite,
    maxY: cy + halbeTiefe,
  };
}

/** Prüft, ob das gerenderte Objekt vollständig innerhalb der Raumgrenzen liegt. */
export function istObjektImRaum(objekt: RaumObjektV1, raumBreiteCm: number, raumLaengeCm: number): boolean {
  const g = objektGrenzen(objekt);
  const eps = 1e-9; // Gleitkomma-Toleranz an den Raumgrenzen
  return g.minX >= -eps && g.minY >= -eps && g.maxX <= raumBreiteCm + eps && g.maxY <= raumLaengeCm + eps;
}

/**
 * Sinnvolle Startposition pro Objektart, immer auf eine gültige Position
 * innerhalb der Raumgrenzen geklemmt — auch wenn der Raum kleiner als das
 * Standardobjekt-Ankerlayout ist.
 */
export function startPosition(
  typ: RaumObjektTyp,
  raumBreiteCm: number,
  raumLaengeCm: number,
): { x_cm: number; y_cm: number } {
  const std = STANDARD_OBJEKTE[typ];
  const maxX = Math.max(raumBreiteCm - std.breiteCm, 0);
  const maxY = Math.max(raumLaengeCm - std.tiefeCm, 0);

  let x: number;
  let y: number;
  switch (typ) {
    case 'board':
      // Tafel mittig an der Stirnwand
      x = (raumBreiteCm - std.breiteCm) / 2;
      y = 0;
      break;
    case 'teacher_desk':
      // Lehrerpult mittig vor der Tafel
      x = (raumBreiteCm - std.breiteCm) / 2;
      y = STANDARD_OBJEKTE.board.tiefeCm + 40;
      break;
    case 'door':
      // Tür unten links an der Wand (Breite entlang der Wand)
      x = 0;
      y = raumLaengeCm - std.tiefeCm;
      break;
    case 'window':
      // Fenster mittig an der linken Wand (Tiefe entlang der Wand)
      x = 0;
      y = (raumLaengeCm - std.tiefeCm) / 2;
      break;
    case 'table_single':
    case 'table_double':
      // Schülertische starten in der Raummitte
      x = (raumBreiteCm - std.breiteCm) / 2;
      y = (raumLaengeCm - std.tiefeCm) / 2;
      break;
  }
  return { x_cm: klemmeWert(x, 0, maxX), y_cm: klemmeWert(y, 0, maxY) };
}
