import { z } from 'zod';
import { RaumGeometrieSchema } from '../raum/raum';

// Versionierter, framework-freier Sitzplan-Vertrag (ADR-0003): keine
// Konva-Nodes, keine React-Typen. Das Dokument friert die Raumgeometrie der
// Quellvorlage zum Zeitpunkt der Plananlage ein — spätere Änderungen der
// Vorlage verändern bestehende Pläne nicht rückwirkend. Der Geometrievertrag
// stammt vollständig aus dem Raummodul (inklusive aller harten Invarianten),
// damit der eingefrorene Plan keinen schwächeren Parallelvertrag aufmacht,
// sobald der Editor ab M3 #57/#59 Geometrie zurückschreibt.
//
// In diesem Slice (M3 #56/#57) existiert ausschließlich Version 1; eine
// Migrationsfunktion wird erst mit der zweiten Version fällig.

/**
 * Eine einzelne Schülerzuordnung (M3 #57). Bewusst eine normalisierte Liste
 * statt `Record<SitzplatzId, SchuelerId>`: Sie passt zur bestehenden
 * Array-Form der Geometrie, ist JSON-stabil und erlaubt eine deterministische
 * Serialisierung (stabil nach `sitzplatzId` sortiert), damit Revisions- und
 * Versionsvergleiche in M3 #58/#59 nicht an Reihenfolgerauschen scheitern.
 *
 * Die Ablage ist bewusst kein persistiertes Feld: „in der Ablage" heißt
 * „aktiver Schüler der Klasse ohne Eintrag in `zuordnungen`". Eine zusätzlich
 * gespeicherte Ablageliste wäre eine zweite Wahrheit.
 */
export const ZuordnungSchema = z.object({
  sitzplatzId: z.string().min(1),
  schuelerId: z.string().min(1),
});

export type Zuordnung = z.infer<typeof ZuordnungSchema>;

/**
 * Harte Zuordnungs-Invarianten in fachlicher Reihenfolge. Reihenfolge ist Teil
 * des Vertrags: Aufrufer werten die erste Meldung als Fehlerursache aus.
 */
export const SITZPLAN_ZUORDNUNG_INVARIANTEN: ReadonlyArray<{
  pruefe: (zuordnungen: Zuordnung[], sitzplatzIds: Set<string>) => boolean;
  message: string;
}> = [
  {
    pruefe: (zuordnungen, sitzplatzIds) => zuordnungen.every((z) => sitzplatzIds.has(z.sitzplatzId)),
    message: 'Jede Zuordnung muss auf einen Sitzplatz des eingefrorenen Raumdokuments verweisen.',
  },
  {
    pruefe: (zuordnungen) => new Set(zuordnungen.map((z) => z.sitzplatzId)).size === zuordnungen.length,
    message: 'Ein Sitzplatz darf höchstens einen Schüler tragen.',
  },
  {
    pruefe: (zuordnungen) => new Set(zuordnungen.map((z) => z.schuelerId)).size === zuordnungen.length,
    message: 'Ein Schüler darf höchstens auf einem Sitzplatz sitzen.',
  },
];

export const SitzplanDokumentV1Schema = z.object({
  version: z.literal(1),
  quelle: z.object({
    klasseId: z.string().min(1),
    raumId: z.string().min(1),
  }),
  raumGeometrie: RaumGeometrieSchema,
  // Schülerzuordnung (M3 #57) — leer, solange niemand platziert ist.
  zuordnungen: z.array(ZuordnungSchema).default([]),
}).superRefine((doc, ctx) => {
  const sitzplatzIds = new Set(doc.raumGeometrie.sitzplaetze.map((s) => s.id));
  for (const invariante of SITZPLAN_ZUORDNUNG_INVARIANTEN) {
    if (!invariante.pruefe(doc.zuordnungen, sitzplatzIds)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['zuordnungen'], message: invariante.message });
    }
  }
});

export type SitzplanDokumentV1 = z.infer<typeof SitzplanDokumentV1Schema>;

/** Aktuelle Dokumentversion, die Schreiber persistieren. */
export const AKTUELLE_SITZPLAN_DOKUMENT_VERSION = 1;

export const SitzplanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  userId: z.string().min(1),
  klasseId: z.string().min(1),
  raumId: z.string().min(1),
  revision: z.number().int().positive(),
  dokumentVersion: z.number().int().positive(),
  canvasDocument: SitzplanDokumentV1Schema,
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  deletedAt: z.union([z.date(), z.string()]).nullable(),
});

export type Sitzplan = z.infer<typeof SitzplanSchema>;

const nameField = () =>
  z.string({ required_error: 'Name ist erforderlich.', invalid_type_error: 'Name ist erforderlich.' })
    .trim()
    .min(1, 'Name ist erforderlich.')
    .max(100, 'Name darf maximal 100 Zeichen haben.');

export const CreateSitzplanInputSchema = z.object({
  name: nameField(),
  klasseId: z.string({ required_error: 'Klasse ist erforderlich.', invalid_type_error: 'Klasse ist erforderlich.' })
    .min(1, 'Klasse ist erforderlich.'),
  raumId: z.string({ required_error: 'Raumvorlage ist erforderlich.', invalid_type_error: 'Raumvorlage ist erforderlich.' })
    .min(1, 'Raumvorlage ist erforderlich.'),
});

export type CreateSitzplanInput = z.infer<typeof CreateSitzplanInputSchema>;

// In diesem Slice ist ausschließlich Umbenennen erlaubt: Quellklasse,
// Quellvorlage, Revision und Dokument bleiben über PATCH unveränderlich.
// Autosave und Revisionskonflikte folgen mit M3 #59 (ADR-0004).
export const UpdateSitzplanInputSchema = z.object({
  name: nameField(),
});

export type UpdateSitzplanInput = z.infer<typeof UpdateSitzplanInputSchema>;

/**
 * Schreibvertrag der Schülerzuordnung (M3 #57): Der Client sendet
 * ausschließlich die gewünschte Zuordnungsliste. Geometrie und Quelle bleiben
 * eingefroren und werden serverseitig aus dem bestehenden Dokument
 * übernommen — der Client kann sie über diesen Pfad nicht verändern.
 * Debounce-Autosave und Revisionskonflikte folgen mit M3 #59 (ADR-0004).
 */
export const SetzeZuordnungenInputSchema = z.object({
  zuordnungen: z.array(ZuordnungSchema, {
    required_error: 'Zuordnungen sind erforderlich.',
    invalid_type_error: 'Zuordnungen müssen eine Liste sein.',
  }),
});

export type SetzeZuordnungenInput = z.infer<typeof SetzeZuordnungenInputSchema>;
