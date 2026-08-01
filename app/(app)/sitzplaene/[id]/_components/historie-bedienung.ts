import type { Zuordnung } from '../../../../../src/domain/sitzplan';
import { gleicheZuordnungen } from '../../../../../src/domain/sitzplan/zuordnung-commands';
import {
  ermittleAenderungsZustand,
  kannRedo,
  kannUndo,
  redo,
  undo,
  type AenderungsZustand,
  type Historie,
} from '../../../../../src/domain/sitzplan/historie';

// Framework-freie Bedienlogik der Editor-Historie (M3 #58), nach dem Muster von
// `zuordnung-interaktion.ts`: Was eine Bedienhandlung bewirkt — und was sie
// bewusst *nicht* bewirkt — steht hier als reine Funktion und ist ohne DOM
// testbar. Die React-Komponente bleibt eine dünne Schale, die ausführt und
// rendert.

export type ZuordnungsHistorie = Historie<Zuordnung[]>;

export type HistorieAktion =
  /** Neuer Historienwert; die Komponente schreibt dessen Gegenwart über den Endpunkt. */
  | { art: 'anwenden'; historie: ZuordnungsHistorie; meldung: string }
  /** Nichts ändert sich; die Meldung erklärt warum. */
  | { art: 'abgelehnt'; meldung: string };

export function macheRueckgaengig(historie: ZuordnungsHistorie): HistorieAktion {
  if (!kannUndo(historie)) {
    return { art: 'abgelehnt', meldung: 'Es gibt keine Änderung, die rückgängig gemacht werden kann.' };
  }
  return { art: 'anwenden', historie: undo(historie), meldung: 'Änderung rückgängig gemacht.' };
}

export function stelleWiederHer(historie: ZuordnungsHistorie): HistorieAktion {
  if (!kannRedo(historie)) {
    return { art: 'abgelehnt', meldung: 'Es gibt keine Änderung, die wiederhergestellt werden kann.' };
  }
  return { art: 'anwenden', historie: redo(historie), meldung: 'Änderung wiederhergestellt.' };
}

/** Änderungszustand der Zuordnungen gegen den zuletzt bestätigten Serverstand. */
export function ermittleZuordnungsZustand(
  historie: ZuordnungsHistorie,
  lage: { speichert: boolean; fehler: boolean },
): AenderungsZustand {
  return ermittleAenderungsZustand(historie, lage, gleicheZuordnungen);
}

/** Sichtbare Beschriftung je Änderungszustand. */
export const AENDERUNGS_ZUSTAND_TEXT: Record<AenderungsZustand, string> = {
  gespeichert: 'Gespeichert',
  'geändert': 'Geändert, noch nicht gespeichert',
  speichert: 'Speichert …',
  fehler: 'Nicht gespeichert — Speichern fehlgeschlagen',
};

export type Plattform = 'mac' | 'sonstige';

/**
 * Plattformkonvention aus einer Browserkennung. Bewusst eine reine Funktion
 * über einer Zeichenkette: Die Komponente reicht `navigator.userAgent` herein,
 * die Entscheidung selbst bleibt ohne Browser prüfbar.
 */
export function ermittlePlattform(kennung: string): Plattform {
  return /mac|iphone|ipad|ipod/i.test(kennung) ? 'mac' : 'sonstige';
}

/** Nur die Felder eines Tastaturereignisses, die die Entscheidung braucht. */
export interface TastaturEreignis {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly ziel: EreignisZiel | null;
}

/** Beschreibung des Ereignisziels — aus dem DOM gelesen, hier reine Daten. */
export interface EreignisZiel {
  readonly tagName: string;
  readonly typ?: string | null;
  readonly istEditierbar?: boolean;
}

export type TastaturBefehl = 'rueckgaengig' | 'wiederherstellen' | null;

/**
 * Eingabearten, in denen der Browser mit demselben Kürzel *keinen* Text
 * zurücknimmt. Alles andere — auch `search`, `email`, `number` oder ein Feld
 * ohne `type` — gilt als Texteingabe.
 */
const NICHT_TEXT_EINGABEN = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/**
 * Ob der Fokus in einer Eingabe steht, in der das Kürzel Inhalte verändern
 * würde. Der Plan hat ein Namensfeld direkt neben dem Editor — dort muss
 * „Rückgängig" die Texteingabe zurücknehmen und nicht die Sitzordnung.
 */
export function istTexteingabe(ziel: EreignisZiel | null): boolean {
  if (!ziel) return false;
  if (ziel.istEditierbar) return true;

  const tag = ziel.tagName.toUpperCase();
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') return !NICHT_TEXT_EINGABEN.has((ziel.typ ?? 'text').toLowerCase());
  return false;
}

/**
 * Übersetzt ein Tastaturereignis in einen Historienbefehl.
 *
 * Plattformkonvention: Auf macOS ist die Befehlstaste der Modifikator, sonst
 * Strg. Der jeweils fremde Modifikator greift ausdrücklich nicht — auf macOS
 * ist Strg+Z kein Undo, unter Windows und Linux ist Meta die Fenstertaste.
 * Wiederherstellen liegt auf Umschalt+Modifikator+Z; zusätzlich gilt außerhalb
 * von macOS das dort verbreitete Strg+Y.
 */
export function ermittleTastaturBefehl(ereignis: TastaturEreignis, plattform: Plattform): TastaturBefehl {
  const modifikator = plattform === 'mac' ? ereignis.metaKey : ereignis.ctrlKey;
  const fremderModifikator = plattform === 'mac' ? ereignis.ctrlKey : ereignis.metaKey;
  if (!modifikator || fremderModifikator) return null;
  if (istTexteingabe(ereignis.ziel)) return null;

  const taste = ereignis.key.toLowerCase();
  if (taste === 'z') return ereignis.shiftKey ? 'wiederherstellen' : 'rueckgaengig';
  if (taste === 'y' && plattform === 'sonstige' && !ereignis.shiftKey) return 'wiederherstellen';
  return null;
}
