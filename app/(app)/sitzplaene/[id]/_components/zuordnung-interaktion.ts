import type { Zuordnung } from '../../../../../src/domain/sitzplan';
import { setzeSchueler, tausche, entferne } from '../../../../../src/domain/sitzplan/zuordnung-commands';

// Framework-freie Bedienlogik der Schülerzuordnung (M3 #57), nach dem Muster
// von `app/(app)/raeume/[id]/_components/tastatur.ts`: Die Entscheidung, was
// eine Bedienhandlung bewirkt, liegt hier als reine Funktion — nicht in der
// React-Komponente. Dadurch ist genau das Verhalten testbar, das die
// Akzeptanzkriterien fordern, ohne DOM und ohne zusätzliche Testabhängigkeit.
// Die Komponente bleibt eine dünne Schale: Sie führt aus, was hier entschieden
// wurde, und rendert das Ergebnis.

export type Auswahl =
  | { art: 'ablage'; schuelerId: string }
  | { art: 'sitzplatz'; sitzplatzId: string }
  | null;

export interface InteraktionsZustand {
  zuordnungen: Zuordnung[];
  auswahl: Auswahl;
  /** Anzeigename je Schülerprofil-ID; fehlende IDs sind nicht mehr aktive Profile. */
  schuelerNamen: ReadonlyMap<string, string>;
  /** Anzeigename je Sitzplatz-ID. */
  platzNamen: ReadonlyMap<string, string>;
}

export type Interaktion =
  /** Neue Zuordnungen — die Komponente schreibt sie über den Endpunkt. */
  | { art: 'speichern'; zuordnungen: Zuordnung[]; meldung: string }
  /** Nur die Auswahl ändert sich. */
  | { art: 'auswahl'; auswahl: Auswahl; meldung: string }
  /** Nichts ändert sich; die Meldung erklärt warum. */
  | { art: 'abgelehnt'; meldung: string };

export const NICHT_AKTIV = 'nicht mehr aktives Schülerprofil';
export const START_MELDUNG = 'Kein Schüler und kein Sitzplatz ausgewählt.';

const schuelerName = (zustand: InteraktionsZustand, schuelerId: string) =>
  zustand.schuelerNamen.get(schuelerId) ?? NICHT_AKTIV;

const platzName = (zustand: InteraktionsZustand, sitzplatzId: string) =>
  zustand.platzNamen.get(sitzplatzId) ?? sitzplatzId;

const belegtVon = (zustand: InteraktionsZustand, sitzplatzId: string) =>
  zustand.zuordnungen.find((z) => z.sitzplatzId === sitzplatzId)?.schuelerId;

/** Wählt einen Schüler in der Ablage aus oder hebt dessen Auswahl wieder auf. */
export function waehleAusAblage(zustand: InteraktionsZustand, schuelerId: string): Interaktion {
  if (zustand.auswahl?.art === 'ablage' && zustand.auswahl.schuelerId === schuelerId) {
    return { art: 'auswahl', auswahl: null, meldung: 'Auswahl aufgehoben.' };
  }
  return {
    art: 'auswahl',
    auswahl: { art: 'ablage', schuelerId },
    meldung: `${schuelerName(zustand, schuelerId)} ausgewählt. Jetzt einen freien Sitzplatz aktivieren.`,
  };
}

/**
 * Zentrale Aktion auf einen Sitzplatz — identisch für Klick, Tastatur und
 * Drop, damit alle Bedienwege dieselbe Fachentscheidung treffen.
 *
 * Genau die vier vom Issue spezifizierten Richtungen sind erlaubt. „Ablage →
 * belegter Sitzplatz" gehört nicht dazu und wird deshalb **abgelehnt** statt
 * den bisherigen Platzinhaber still in die Ablage zu verdrängen: Undo ist in
 * diesem Slice nicht verfügbar, und eine Verdrängung, die nur sehende Nutzer
 * bemerken, ist kein akzeptabler stiller Datenverlust. Das löst zugleich die
 * Zusicherung im Kommentar von `setzeSchueler` ein.
 */
export function aktiviereSitzplatz(zustand: InteraktionsZustand, sitzplatzId: string): Interaktion {
  const inhaber = belegtVon(zustand, sitzplatzId);
  const ziel = platzName(zustand, sitzplatzId);

  if (zustand.auswahl?.art === 'ablage') {
    if (inhaber !== undefined) {
      return {
        art: 'abgelehnt',
        meldung:
          `${ziel} ist bereits von ${schuelerName(zustand, inhaber)} belegt. ` +
          'Lege den bisherigen Schüler erst in die Ablage zurück, oder wähle statt der Ablage ' +
          'einen belegten Sitzplatz aus, um die Plätze zu tauschen.',
      };
    }
    return {
      art: 'speichern',
      zuordnungen: setzeSchueler(zustand.zuordnungen, { schuelerId: zustand.auswahl.schuelerId, sitzplatzId }),
      meldung: `${schuelerName(zustand, zustand.auswahl.schuelerId)} sitzt jetzt auf ${ziel}.`,
    };
  }

  if (zustand.auswahl?.art === 'sitzplatz') {
    if (zustand.auswahl.sitzplatzId === sitzplatzId) {
      return { art: 'auswahl', auswahl: null, meldung: 'Auswahl aufgehoben.' };
    }
    return {
      art: 'speichern',
      zuordnungen: tausche(zustand.zuordnungen, zustand.auswahl.sitzplatzId, sitzplatzId),
      meldung: inhaber !== undefined ? `Plätze getauscht mit ${ziel}.` : `Auf ${ziel} verschoben.`,
    };
  }

  if (inhaber === undefined) {
    return { art: 'abgelehnt', meldung: `${ziel} ist frei. Wähle zuerst einen Schüler in der Ablage aus.` };
  }

  return {
    art: 'auswahl',
    auswahl: { art: 'sitzplatz', sitzplatzId },
    meldung: `${schuelerName(zustand, inhaber)} auf ${ziel} ausgewählt. Jetzt Zielplatz oder Ablage aktivieren.`,
  };
}

/** Legt den Schüler eines belegten Sitzplatzes zurück in die Ablage. */
export function legeZurueck(zustand: InteraktionsZustand, sitzplatzId: string): Interaktion {
  const inhaber = belegtVon(zustand, sitzplatzId);
  if (inhaber === undefined) {
    return { art: 'abgelehnt', meldung: `${platzName(zustand, sitzplatzId)} ist bereits frei.` };
  }
  return {
    art: 'speichern',
    zuordnungen: entferne(zustand.zuordnungen, inhaber),
    meldung: `${schuelerName(zustand, inhaber)} liegt wieder in der Ablage.`,
  };
}

// Drag-and-drop-Nutzlast: Die Quelle wird typisiert übertragen und über
// exakt dieselben Entscheidungen ausgewertet wie der Tastaturweg.
export const dragNutzlastSchueler = (schuelerId: string) => `schueler:${schuelerId}`;
export const dragNutzlastSitzplatz = (sitzplatzId: string) => `sitzplatz:${sitzplatzId}`;

/**
 * Wertet einen Drop auf einen Sitzplatz aus. Die Nutzlast ersetzt die
 * Auswahl — gezogen wird immer ausgehend von der gepackten Quelle.
 */
export function dropAufSitzplatz(
  zustand: InteraktionsZustand,
  nutzlast: string,
  sitzplatzId: string,
): Interaktion {
  if (nutzlast.startsWith('schueler:')) {
    return aktiviereSitzplatz(
      { ...zustand, auswahl: { art: 'ablage', schuelerId: nutzlast.slice('schueler:'.length) } },
      sitzplatzId,
    );
  }
  if (nutzlast.startsWith('sitzplatz:')) {
    const quelle = nutzlast.slice('sitzplatz:'.length);
    if (quelle === sitzplatzId) {
      return { art: 'abgelehnt', meldung: START_MELDUNG };
    }
    return aktiviereSitzplatz({ ...zustand, auswahl: { art: 'sitzplatz', sitzplatzId: quelle } }, sitzplatzId);
  }
  return { art: 'abgelehnt', meldung: START_MELDUNG };
}

/** Wertet einen Drop auf die Ablage aus — nur Sitzplatzquellen sind sinnvoll. */
export function dropAufAblage(zustand: InteraktionsZustand, nutzlast: string): Interaktion {
  if (!nutzlast.startsWith('sitzplatz:')) {
    return { art: 'abgelehnt', meldung: START_MELDUNG };
  }
  return legeZurueck(zustand, nutzlast.slice('sitzplatz:'.length));
}
