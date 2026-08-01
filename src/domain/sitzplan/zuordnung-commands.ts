import type { Zuordnung } from './sitzplan';

// Framework-freie Zuordnungs-Commands (M3 #57): reine Funktionen auf der
// normalisierten Zuordnungsliste — keine React-, Konva-, Drizzle- oder
// Persistenzlogik. Jede Funktion liefert eine neue Liste (keine Mutation der
// Eingabe) und hält die drei harten Invarianten des Plandokuments ein:
//   1. jede sitzplatzId existiert in der eingefrorenen Raumgeometrie
//      (Referenzintegrität — hier über die Aufrufer und den Zod-Vertrag),
//   2. höchstens ein Schüler je Sitzplatz,
//   3. höchstens ein Sitzplatz je Schüler.
// Der Service validiert das Ergebnis erneut gegen den Vertrag und schreibt es
// atomar; diese Commands entscheiden nichts über Persistenz.

/**
 * Deterministische Reihenfolge: stabil aufsteigend nach `sitzplatzId` in
 * Codepoint-Ordnung (bewusst kein `localeCompare` — locale-unabhängig und
 * damit über Umgebungen hinweg identisch). Da Sitzplatz-IDs innerhalb eines
 * Dokuments eindeutig sind, ist das eine strenge Totalordnung: Zwei fachlich
 * gleiche Zuordnungsmengen serialisieren immer byte-identisch.
 */
export function sortiereZuordnungen(zuordnungen: readonly Zuordnung[]): Zuordnung[] {
  return [...zuordnungen].sort((a, b) => (a.sitzplatzId < b.sitzplatzId ? -1 : a.sitzplatzId > b.sitzplatzId ? 1 : 0));
}

/**
 * Setzt einen Schüler auf einen Sitzplatz.
 *
 * Ein bisher woanders sitzender Schüler wird dabei umgesetzt, nicht dupliziert
 * (Invariante 3). War der Zielplatz von einem anderen Schüler belegt, kehrt
 * dieser in die Ablage zurück (Invariante 2) — die Bedienoberfläche bietet
 * diesen Weg nur für freie Plätze an und leitet den belegten Fall bewusst auf
 * {@link tausche}, damit niemand versehentlich verdrängt wird.
 */
export function setzeSchueler(
  zuordnungen: readonly Zuordnung[],
  { schuelerId, sitzplatzId }: Zuordnung,
): Zuordnung[] {
  const rest = zuordnungen.filter((z) => z.schuelerId !== schuelerId && z.sitzplatzId !== sitzplatzId);
  return sortiereZuordnungen([...rest, { sitzplatzId, schuelerId }]);
}

/**
 * Tauscht die Belegung zweier Sitzplätze atomar — auch dann, wenn nur einer
 * der beiden Plätze belegt ist (dann wird verschoben). Zwei freie Plätze und
 * der Tausch eines Platzes mit sich selbst bleiben folgenlos. Es gibt keinen
 * Zwischenzustand, in dem ein Schüler doppelt oder gar nicht vorkommt.
 */
export function tausche(zuordnungen: readonly Zuordnung[], sitzplatzA: string, sitzplatzB: string): Zuordnung[] {
  if (sitzplatzA === sitzplatzB) {
    return sortiereZuordnungen(zuordnungen);
  }

  const aufA = zuordnungen.find((z) => z.sitzplatzId === sitzplatzA);
  const aufB = zuordnungen.find((z) => z.sitzplatzId === sitzplatzB);
  const rest = zuordnungen.filter((z) => z.sitzplatzId !== sitzplatzA && z.sitzplatzId !== sitzplatzB);

  const getauscht = [...rest];
  if (aufB) getauscht.push({ sitzplatzId: sitzplatzA, schuelerId: aufB.schuelerId });
  if (aufA) getauscht.push({ sitzplatzId: sitzplatzB, schuelerId: aufA.schuelerId });

  return sortiereZuordnungen(getauscht);
}

/** Legt einen Schüler zurück in die Ablage. Für nicht sitzende Schüler folgenlos. */
export function entferne(zuordnungen: readonly Zuordnung[], schuelerId: string): Zuordnung[] {
  return sortiereZuordnungen(zuordnungen.filter((z) => z.schuelerId !== schuelerId));
}

/**
 * Abgeleitete Ablage: genau die aktiven Schüler ohne Zuordnung, in der
 * Reihenfolge der übergebenen aktiven Schüler. Die Ablage wird nie
 * persistiert — sie ist eine Funktion aus Klassenbestand und Zuordnungen und
 * kann deshalb nicht mit dem Plandokument auseinanderlaufen.
 */
export function ablageSchuelerIds(
  aktiveSchuelerIds: readonly string[],
  zuordnungen: readonly Zuordnung[],
): string[] {
  const sitzend = new Set(zuordnungen.map((z) => z.schuelerId));
  return aktiveSchuelerIds.filter((id) => !sitzend.has(id));
}

export type ZuordnungBefundCode = 'SCHUELER_NICHT_AKTIV';

export interface ZuordnungBefund {
  code: ZuordnungBefundCode;
  sitzplatzId: string;
  schuelerId: string;
  meldung: string;
}

/**
 * Inkonsistenzbefunde beim Laden (M3 #57): Ein älterer Plan kann Schüler
 * referenzieren, die inzwischen soft-gelöscht oder in eine andere Klasse
 * verschoben wurden. Solche Zuordnungen werden gemeldet, aber weder still
 * entfernt noch als Ladefehler behandelt — der Plan bleibt öffenbar, und die
 * Lehrkraft entscheidet selbst.
 */
export function ermittleBefunde(
  zuordnungen: readonly Zuordnung[],
  aktiveSchuelerIds: readonly string[],
): ZuordnungBefund[] {
  const aktiv = new Set(aktiveSchuelerIds);
  return zuordnungen
    .filter((z) => !aktiv.has(z.schuelerId))
    .map((z) => ({
      code: 'SCHUELER_NICHT_AKTIV' as const,
      sitzplatzId: z.sitzplatzId,
      schuelerId: z.schuelerId,
      meldung:
        `Der Sitzplatz „${z.sitzplatzId}" verweist auf ein Schülerprofil, das in dieser Klasse ` +
        'nicht mehr aktiv ist. Der Platz bleibt belegt, bis er hier zurückgelegt wird.',
    }));
}
