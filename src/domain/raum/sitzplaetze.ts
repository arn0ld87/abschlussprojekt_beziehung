import { z } from 'zod';
import type { RaumObjektTyp, RaumObjektV1 } from './objekte';

// Adressierbare Sitzplätze an Tischobjekten (M2 #54). Framework-frei: keine
// Konva- oder React-Typen. Sitzplätze sind Teil des versionierten
// Canvas-Dokuments (V3) und werden von den Objektaktionen atomar mit dem
// Parent-Tisch erzeugt, dupliziert und entfernt.

/** Tischtypen mit Sitzplätzen — Lehrerpult, Tafel, Tür und Fenster bleiben im MVP ohne. */
export const TISCH_TYPEN = ['table_single', 'table_double'] as const;

export type TischTyp = (typeof TISCH_TYPEN)[number];

export function istTisch(typ: RaumObjektTyp): typ is TischTyp {
  return (TISCH_TYPEN as readonly string[]).includes(typ);
}

/**
 * Festgelegte Anzahl adressierbarer Sitzplätze pro Tischtyp (Spezifikation
 * M2 #54): Einzeltisch 1 Platz, Doppeltisch 2 Plätze.
 */
export const SITZPLAETZE_PRO_TISCH: Record<TischTyp, number> = {
  table_single: 1,
  table_double: 2,
};

/**
 * Sitzplatz-Vertrag V1: stabile ID, Parent-Objekt-ID, lokaler Anker relativ
 * zur linken oberen Ecke des unrotierten Parent-Objekts (Zentimeter) und
 * optionale Bezeichnung. Der lokale Anker macht IDs und Geometrie stabil
 * gegenüber Verschieben und Drehen des Tisches.
 */
export const SitzplatzV1Schema = z.object({
  id: z.string().min(1),
  objektId: z.string().min(1),
  lokalX_cm: z.number().finite().min(0, 'lokalX_cm darf nicht negativ sein.'),
  lokalY_cm: z.number().finite().min(0, 'lokalY_cm darf nicht negativ sein.'),
  bezeichnung: z.string().max(50).optional(),
});

export type SitzplatzV1 = z.infer<typeof SitzplatzV1Schema>;

/**
 * Deterministischer lokaler Anker des i-ten Sitzplatzes (0-basiert): Die
 * Plätze sitzen auf der Stirnseite des Tisches (lokale Kante y = tiefe_cm,
 * zur Tafel zeigend) und verteilen sich gleichmäßig über die Tischbreite.
 * Der Anker liegt immer auf der fachlichen Tischgeometrie (0 ≤ x ≤ breite,
 * 0 ≤ y ≤ tiefe).
 */
export function sitzplatzAnker(breiteCm: number, tiefeCm: number, index: number, anzahl: number) {
  return {
    lokalX_cm: ((index + 1) * breiteCm) / (anzahl + 1),
    lokalY_cm: tiefeCm,
  };
}

/**
 * Erzeugt die Sitzplätze eines Tischobjekts deterministisch: IDs werden aus
 * der Objekt-ID abgeleitet (`<objektId>__sitz_<n>`) — stabil bei Bewegung
 * und Rotation, automatisch disjunkt beim Duplizieren (neue Objekt-ID).
 */
export function erzeugeSitzplaetze(objekt: RaumObjektV1): SitzplatzV1[] {
  if (!istTisch(objekt.typ)) {
    return [];
  }
  const anzahl = SITZPLAETZE_PRO_TISCH[objekt.typ];
  return Array.from({ length: anzahl }, (_, i) => ({
    id: `${objekt.id}__sitz_${i + 1}`,
    objektId: objekt.id,
    ...sitzplatzAnker(objekt.breite_cm, objekt.tiefe_cm, i, anzahl),
    bezeichnung: `Platz ${i + 1}`,
  }));
}

/** Prüft, ob der lokale Anker auf der fachlichen Tischgeometrie liegt. */
export function sitzplatzAufObjekt(sitz: SitzplatzV1, objekt: RaumObjektV1): boolean {
  const eps = 1e-9; // Gleitkomma-Toleranz an den Kanten
  return (
    sitz.lokalX_cm >= -eps &&
    sitz.lokalY_cm >= -eps &&
    sitz.lokalX_cm <= objekt.breite_cm + eps &&
    sitz.lokalY_cm <= objekt.tiefe_cm + eps
  );
}

/**
 * Weltposition eines Sitzplatzes in Raumzentimetern: Der lokale Anker wird
 * wie im Renderer (Konva offset) um den Objektmittelpunkt rotiert und auf
 * die Objektposition abgebildet. Liefert exakt die Position, die der
 * Canvas zeichnet.
 */
export function sitzplatzWeltPosition(sitz: SitzplatzV1, objekt: RaumObjektV1): { x_cm: number; y_cm: number } {
  const cx = objekt.x_cm + objekt.breite_cm / 2;
  const cy = objekt.y_cm + objekt.tiefe_cm / 2;
  const rad = (objekt.rotation_deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = sitz.lokalX_cm - objekt.breite_cm / 2;
  const dy = sitz.lokalY_cm - objekt.tiefe_cm / 2;
  return {
    x_cm: cx + dx * cos - dy * sin,
    y_cm: cy + dx * sin + dy * cos,
  };
}

/**
 * Dupliziert die Sitzplätze eines Tisches mit neuer Parent- und neuen
 * Sitzplatz-IDs (gleiche lokale Anker). Ergebnis-IDs sind vollständig
 * disjunkt zu den Originalen.
 */
export function dupliziereSitzplaetze(
  sitzplaetze: SitzplatzV1[],
  alteObjektId: string,
  neueObjektId: string,
): SitzplatzV1[] {
  return sitzplaetze
    .filter((s) => s.objektId === alteObjektId)
    .map((s) => ({
      ...s,
      id: `${neueObjektId}${s.id.slice(alteObjektId.length)}`,
      objektId: neueObjektId,
    }));
}

/** Entfernt alle Sitzplätze eines Objekts (atomar mit dem Parent-Delete). */
export function entferneSitzplaetzeVon(sitzplaetze: SitzplatzV1[], objektId: string): SitzplatzV1[] {
  return sitzplaetze.filter((s) => s.objektId !== objektId);
}
