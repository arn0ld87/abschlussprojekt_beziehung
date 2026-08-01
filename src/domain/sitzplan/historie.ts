// Framework-freie, begrenzte Editor-Historie (M3 #58): reine Funktionen auf
// einem unveränderlichen Zustandsstapel — kein React, kein Konva, kein Drizzle,
// keine Persistenz. Jede Funktion liefert einen neuen Wert; die Eingabe wird
// nie mutiert.
//
// Die Historie hält **validierbare Zustände, kein Ereignisprotokoll**: Jeder
// Eintrag ist ein vollständiger Dokumentzustand (hier die Zuordnungsliste des
// `SitzplanDokumentV1`), nie ein „was wurde getan"-Datensatz. Das ist die
// bewusste Umsetzung von ADR-0010 (granulare Ereignishistorie zurückgestellt)
// und ADR-0004 (persistiert werden vollständige, versionierte Dokumente).
// Nichts aus diesem Modul wird an den Server geschickt oder gespeichert — es
// ist reiner Clientzustand für die laufende Bearbeitung und endet mit ihr.

/**
 * Obergrenze der Undo-Schritte.
 *
 * Bewusst gewählt: Eine Klasse im MVP-Zuschnitt hat rund 30 Sitzplätze, eine
 * vollständige Neubelegung von Hand also rund 30 Bedienschritte. 50 Schritte
 * decken damit mehr als eine komplette Umsetzung der ganzen Klasse ab und
 * reichen sicher über die Arbeitseinheit hinaus, an die sich eine Lehrkraft
 * ohne Benennung noch erinnert. Nach oben bindet die Grenze den Speicher: Ein
 * Zustand ist eine Liste von höchstens ~30 kleinen Objekten, 50 davon liegen
 * im niedrigen dreistelligen Kilobytebereich und damit weit unter jeder für den
 * Browser relevanten Schwelle. Weiter zurückreichende Stände sind Aufgabe der
 * benannten Planversionen (M3 #61, ADR-0004), nicht der Editor-Historie.
 */
export const HISTORIE_GRENZE = 50;

/**
 * Unveränderlicher Historienwert.
 *
 * `bestaetigt` ist bewusst ein eigenes Feld und **nicht** der Anfang von
 * `vergangenheit`: Der sichtbare Änderungszustand muss gegen den zuletzt vom
 * Server bestätigten Stand vergleichen, nicht gegen den Anfang der Sitzung.
 * Sonst meldete die Oberfläche „gespeichert", während der Server einen anderen
 * Stand hält.
 */
export interface Historie<T> {
  /** Ältester Zustand zuerst; enthält die Gegenwart nicht. */
  readonly vergangenheit: readonly T[];
  readonly gegenwart: T;
  /** Nächster Wiederherstellungsschritt zuerst. */
  readonly zukunft: readonly T[];
  /** Zuletzt vom Server bestätigter Zustand. */
  readonly bestaetigt: T;
  /** Maximale Anzahl rückgängig machbarer Schritte. */
  readonly grenze: number;
}

/**
 * Kürzt einen Stapel auf die Grenze und wirft dabei immer die **ältesten**
 * Einträge weg. Die Gegenwart liegt nie in einem der Stapel und kann deshalb
 * durch die Begrenzung nicht verloren gehen.
 */
function begrenze<T>(stapel: readonly T[], grenze: number): readonly T[] {
  return stapel.length <= grenze ? stapel : stapel.slice(stapel.length - grenze);
}

/** Frische Historie über einem bestätigten Serverstand. */
export function erzeugeHistorie<T>(bestaetigt: T, grenze: number = HISTORIE_GRENZE): Historie<T> {
  if (!Number.isInteger(grenze) || grenze < 1) {
    throw new RangeError('Die Historiengrenze muss eine ganze Zahl ≥ 1 sein.');
  }
  return { vergangenheit: [], gegenwart: bestaetigt, zukunft: [], bestaetigt, grenze };
}

/**
 * Setzt die Historie auf einen neu geladenen Stand zurück — beim Wechsel auf
 * einen anderen Plan oder beim Laden eines bestätigten Serverdokuments. Undo
 * über einen solchen Ladevorgang hinweg gibt es bewusst nicht: Die Stapel
 * bezögen sich sonst auf ein anderes Dokument.
 */
export function setzeZurueck<T>(historie: Historie<T>, bestaetigt: T): Historie<T> {
  return erzeugeHistorie(bestaetigt, historie.grenze);
}

/**
 * Wendet einen neuen Zustand an. Der Wiederherstellungszweig wird dabei
 * verworfen — nach einer neuen Änderung gibt es keinen konsistenten Weg mehr
 * nach vorn.
 */
export function wendeAn<T>(historie: Historie<T>, neu: T): Historie<T> {
  return {
    ...historie,
    vergangenheit: begrenze([...historie.vergangenheit, historie.gegenwart], historie.grenze),
    gegenwart: neu,
    zukunft: [],
  };
}

export function kannUndo<T>(historie: Historie<T>): boolean {
  return historie.vergangenheit.length > 0;
}

export function kannRedo<T>(historie: Historie<T>): boolean {
  return historie.zukunft.length > 0;
}

/** Einen Schritt zurück. Ohne Vergangenheit folgenlos. */
export function undo<T>(historie: Historie<T>): Historie<T> {
  if (!kannUndo(historie)) return historie;
  return {
    ...historie,
    vergangenheit: historie.vergangenheit.slice(0, -1),
    gegenwart: historie.vergangenheit[historie.vergangenheit.length - 1],
    zukunft: [historie.gegenwart, ...historie.zukunft],
  };
}

/** Einen Schritt vor. Ohne Wiederherstellungszweig folgenlos. */
export function redo<T>(historie: Historie<T>): Historie<T> {
  if (!kannRedo(historie)) return historie;
  return {
    ...historie,
    vergangenheit: begrenze([...historie.vergangenheit, historie.gegenwart], historie.grenze),
    gegenwart: historie.zukunft[0],
    zukunft: historie.zukunft.slice(1),
  };
}

/**
 * Übernimmt den vom Server bestätigten Stand als neue Vergleichsbasis.
 *
 * Die Stapel bleiben erhalten: Ein erfolgreiches Speichern darf Undo nicht
 * verbrauchen. Die Gegenwart bleibt bewusst unangetastet — antwortet der Server
 * mit einem abweichenden Dokument, meldet der Änderungszustand ehrlich
 * „geändert" statt „gespeichert". Das Auflösen einer solchen Abweichung ist
 * Aufgabe der Revisionskonflikte (M3 #59).
 */
export function bestaetige<T>(historie: Historie<T>, serverstand: T): Historie<T> {
  return { ...historie, bestaetigt: serverstand };
}

/** Sichtbarer Änderungszustand des Editors. */
export type AenderungsZustand = 'gespeichert' | 'geändert' | 'speichert' | 'fehler';

/**
 * Leitet den sichtbaren Änderungszustand ab. Der Vergleich läuft ausschließlich
 * gegen `bestaetigt`, also gegen das zuletzt vom Server bestätigte Dokument.
 *
 * Reihenfolge: Ein laufender Schreibvorgang und ein zuletzt fehlgeschlagener
 * Schreibvorgang sind Aussagen über den Transport und gehen dem reinen
 * Zustandsvergleich vor. Beide schließen einander aus — ein neuer Versuch löscht
 * den Fehler.
 */
export function ermittleAenderungsZustand<T>(
  historie: Historie<T>,
  lage: { speichert: boolean; fehler: boolean },
  gleich: (a: T, b: T) => boolean,
): AenderungsZustand {
  if (lage.speichert) return 'speichert';
  if (lage.fehler) return 'fehler';
  return gleich(historie.gegenwart, historie.bestaetigt) ? 'gespeichert' : 'geändert';
}
