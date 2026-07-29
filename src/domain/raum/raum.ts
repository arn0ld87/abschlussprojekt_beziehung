import { z } from 'zod';
import { MIN_RASTER_CM } from './koordinaten';

// RaumDokumentV1 ist der versionierte, framework-freie Canvas-Vertrag
// (ADR-0003): keine Konva-Nodes, keine React-Typen. Die Objektliste ist
// in V1 bewusst leer; Möbel und Sitzplätze erweitern den Vertrag erst mit
// den Folge-Slices (#51/#54) unter Schemaversion und Migration.
export const RaumDokumentV1Schema = z.object({
  version: z.literal(1),
  breiteCm: z.number().finite().positive(),
  laengeCm: z.number().finite().positive(),
  rasterCm: z.number().finite().min(MIN_RASTER_CM, `Raster muss mindestens ${MIN_RASTER_CM} cm betragen.`),
  objekte: z.array(z.never()).default([]),
}).refine(
  (doc) => doc.rasterCm <= Math.min(doc.breiteCm, doc.laengeCm),
  { message: 'Raster darf die kleinere Raumseite nicht überschreiten.' }
);

export type RaumDokumentV1 = z.infer<typeof RaumDokumentV1Schema>;

export const RaumSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  userId: z.string().min(1),
  breiteCm: z.number().finite().positive(),
  laengeCm: z.number().finite().positive(),
  rasterCm: z.number().finite().positive(),
  dokumentVersion: z.number().int().positive(),
  canvasDocument: RaumDokumentV1Schema,
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  deletedAt: z.union([z.date(), z.string()]).nullable(),
});

export type Raum = z.infer<typeof RaumSchema>;

const cmField = (label: string) =>
  z.number({ invalid_type_error: `${label} muss eine Zahl sein.` })
    .finite(`${label} muss endlich sein.`)
    .positive(`${label} muss ein positiver Zentimeterwert sein.`);

const rasterField = () =>
  cmField('Raster').min(MIN_RASTER_CM, `Raster muss mindestens ${MIN_RASTER_CM} cm betragen.`);

export const CreateRaumInputSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich.').max(100, 'Name darf maximal 100 Zeichen haben.'),
  breiteCm: cmField('Breite'),
  laengeCm: cmField('Länge'),
  rasterCm: rasterField(),
}).refine(
  (data) => data.rasterCm <= Math.min(data.breiteCm, data.laengeCm),
  { message: 'Raster darf die kleinere Raumseite nicht überschreiten.' }
);

export type CreateRaumInput = z.infer<typeof CreateRaumInputSchema>;

export const UpdateRaumInputSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich.').max(100, 'Name darf maximal 100 Zeichen haben.').optional(),
  breiteCm: cmField('Breite').optional(),
  laengeCm: cmField('Länge').optional(),
  rasterCm: rasterField().optional(),
}).refine(
  (data) => data.name !== undefined || data.breiteCm !== undefined || data.laengeCm !== undefined || data.rasterCm !== undefined,
  { message: 'Mindestens ein Feld muss angegeben werden.' }
);

export type UpdateRaumInput = z.infer<typeof UpdateRaumInputSchema>;
