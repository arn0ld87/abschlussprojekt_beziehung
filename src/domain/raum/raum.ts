import { z } from 'zod';
import { MIN_RASTER_CM } from './koordinaten';
import { RaumObjektV1Schema, istObjektImRaum } from './objekte';

// Versionierte, framework-freie Canvas-Verträge (ADR-0003): keine
// Konva-Nodes, keine React-Typen. V1 ist der Legacy-Vertrag aus #49 (leere
// Objektliste); V2 (#51) ergänzt die diskriminierte Objekt-Union. Leser
// akzeptieren beide Versionen und migrieren V1 validiert nach V2; Schreiber
// persistieren ausschließlich V2.
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

export const RaumDokumentV2Schema = z.object({
  version: z.literal(2),
  breiteCm: z.number().finite().positive(),
  laengeCm: z.number().finite().positive(),
  rasterCm: z.number().finite().min(MIN_RASTER_CM, `Raster muss mindestens ${MIN_RASTER_CM} cm betragen.`),
  objekte: z.array(RaumObjektV1Schema).default([]),
}).refine(
  (doc) => doc.rasterCm <= Math.min(doc.breiteCm, doc.laengeCm),
  { message: 'Raster darf die kleinere Raumseite nicht überschreiten.' }
).refine(
  (doc) => doc.objekte.every((o) => istObjektImRaum(o, doc.breiteCm, doc.laengeCm)),
  { message: 'Alle Objekte müssen vollständig innerhalb der Raumgrenzen liegen.' }
).refine(
  (doc) => new Set(doc.objekte.map((o) => o.id)).size === doc.objekte.length,
  { message: 'Objekt-IDs müssen innerhalb eines Raumdokuments eindeutig sein.' }
);

export type RaumDokumentV2 = z.infer<typeof RaumDokumentV2Schema>;

/** Aktuelle Dokumentversion, die Schreiber persistieren. */
export const AKTUELLE_DOKUMENT_VERSION = 2;

/** Lese-Vertrag: akzeptiert alle bekannten Dokumentversionen. */
export const RaumDokumentSchema = z.union([RaumDokumentV1Schema, RaumDokumentV2Schema]);

export type RaumDokument = z.infer<typeof RaumDokumentSchema>;

/**
 * Validierte Migration V1→V2 (ADR-0003): V1-Dokumente haben garantiert
 * `objekte: []` — die Migration hebt nur die Versionsmarke. Das Ergebnis
 * wird erneut gegen den V2-Vertrag validiert.
 */
export function migriereRaumDokument(doc: RaumDokument): RaumDokumentV2 {
  if (doc.version === AKTUELLE_DOKUMENT_VERSION) {
    return doc as RaumDokumentV2;
  }
  return RaumDokumentV2Schema.parse({
    version: AKTUELLE_DOKUMENT_VERSION,
    breiteCm: doc.breiteCm,
    laengeCm: doc.laengeCm,
    rasterCm: doc.rasterCm,
    objekte: [],
  });
}

export const RaumSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  userId: z.string().min(1),
  breiteCm: z.number().finite().positive(),
  laengeCm: z.number().finite().positive(),
  rasterCm: z.number().finite().positive(),
  dokumentVersion: z.number().int().positive(),
  canvasDocument: RaumDokumentSchema,
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
