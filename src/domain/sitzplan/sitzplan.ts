import { z } from 'zod';
import { RaumObjektV1Schema } from '../raum/objekte';
import { SitzplatzV1Schema } from '../raum/sitzplaetze';

// Versionierter, framework-freier Sitzplan-Vertrag (ADR-0003): keine
// Konva-Nodes, keine React-Typen. Das Dokument friert die Raumgeometrie der
// Quellvorlage zum Zeitpunkt der Plananlage ein — spätere Änderungen der
// Vorlage verändern bestehende Pläne nicht rückwirkend. Objekt- und
// Sitzplatzvertrag werden aus dem Raummodul wiederverwendet, damit
// Sitzplatz-IDs über Vorlage und Plan hinweg dieselbe Bedeutung behalten.
//
// In diesem Slice (M3 #56) existiert ausschließlich Version 1; eine
// Migrationsfunktion wird erst mit der zweiten Version fällig.
export const SitzplanDokumentV1Schema = z.object({
  version: z.literal(1),
  quelle: z.object({
    klasseId: z.string().min(1),
    raumId: z.string().min(1),
  }),
  raumGeometrie: z.object({
    breiteCm: z.number().finite().positive(),
    laengeCm: z.number().finite().positive(),
    rasterCm: z.number().finite().positive(),
    objekte: z.array(RaumObjektV1Schema).default([]),
    sitzplaetze: z.array(SitzplatzV1Schema).default([]),
  }),
  // Reserviert für die Schülerzuordnung (M3 #57); in diesem Slice immer leer.
  zuordnungen: z.array(z.never()).default([]),
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
