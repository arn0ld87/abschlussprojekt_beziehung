import { z } from 'zod';
import { MIN_RASTER_CM } from './koordinaten';
import { RaumObjektV1Schema, istObjektImRaum } from './objekte';
import { SitzplatzV1Schema, erzeugeSitzplaetze, istTisch, sitzplatzAufObjekt } from './sitzplaetze';

// Versionierte, framework-freie Canvas-Verträge (ADR-0003): keine
// Konva-Nodes, keine React-Typen. V1 ist der Legacy-Vertrag aus #49 (leere
// Objektliste); V2 (#51) ergänzt die diskriminierte Objekt-Union; V3 (#54)
// ergänzt adressierbare Sitzplätze an Tischobjekten. Leser akzeptieren alle
// Versionen und migrieren validiert nach V3; Schreiber persistieren
// ausschließlich V3.
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

export const RaumDokumentV3Schema = z.object({
  version: z.literal(3),
  breiteCm: z.number().finite().positive(),
  laengeCm: z.number().finite().positive(),
  rasterCm: z.number().finite().min(MIN_RASTER_CM, `Raster muss mindestens ${MIN_RASTER_CM} cm betragen.`),
  objekte: z.array(RaumObjektV1Schema).default([]),
  sitzplaetze: z.array(SitzplatzV1Schema).default([]),
}).refine(
  (doc) => doc.rasterCm <= Math.min(doc.breiteCm, doc.laengeCm),
  { message: 'Raster darf die kleinere Raumseite nicht überschreiten.' }
).refine(
  (doc) => doc.objekte.every((o) => istObjektImRaum(o, doc.breiteCm, doc.laengeCm)),
  { message: 'Alle Objekte müssen vollständig innerhalb der Raumgrenzen liegen.' }
).refine(
  (doc) => new Set(doc.objekte.map((o) => o.id)).size === doc.objekte.length,
  { message: 'Objekt-IDs müssen innerhalb eines Raumdokuments eindeutig sein.' }
).refine(
  (doc) => new Set(doc.sitzplaetze.map((s) => s.id)).size === doc.sitzplaetze.length,
  { message: 'Sitzplatz-IDs müssen innerhalb eines Raumdokuments eindeutig sein.' }
).refine(
  // Parent-Integrität: Jeder Sitzplatz gehört zu einem existierenden
  // Tischobjekt (nicht zu Lehrerpult, Tafel, Tür oder Fenster).
  (doc) =>
    doc.sitzplaetze.every((s) => {
      const parent = doc.objekte.find((o) => o.id === s.objektId);
      return parent !== undefined && istTisch(parent.typ);
    }),
  { message: 'Jeder Sitzplatz muss zu einem existierenden Tischobjekt gehören.' }
).refine(
  // Kein Sitzplatz außerhalb der fachlichen Tischgeometrie.
  (doc) =>
    doc.sitzplaetze.every((s) => {
      const parent = doc.objekte.find((o) => o.id === s.objektId);
      return parent !== undefined && sitzplatzAufObjekt(s, parent);
    }),
  { message: 'Jeder Sitzplatz muss auf der Geometrie seines Tisches liegen.' }
).refine(
  // Kanonische Sitzplatzmenge: Jeder Tisch besitzt genau seine
  // deterministisch abgeleiteten Sitzplätze (IDs + Anker) — ein gültiges
  // Dokument kann den Sitzplatzbestand eines Tisches weder verlieren noch
  // frei erfinden. Die optionale Bezeichnung bleibt bewusst frei.
  (doc) =>
    doc.objekte
      .filter((o) => istTisch(o.typ))
      .every((tisch) => {
        const kanonisch = erzeugeSitzplaetze(tisch);
        const vorhanden = doc.sitzplaetze.filter((s) => s.objektId === tisch.id);
        return (
          vorhanden.length === kanonisch.length &&
          kanonisch.every((k) =>
            vorhanden.some(
              (s) => s.id === k.id && s.lokalX_cm === k.lokalX_cm && s.lokalY_cm === k.lokalY_cm,
            ),
          )
        );
      }),
  { message: 'Jeder Tisch muss genau seine deterministischen Sitzplätze besitzen.' }
);

export type RaumDokumentV3 = z.infer<typeof RaumDokumentV3Schema>;

/** Aktuelle Dokumentversion, die Schreiber persistieren. */
export const AKTUELLE_DOKUMENT_VERSION = 3;

/** Lese-Vertrag: akzeptiert alle bekannten Dokumentversionen. */
export const RaumDokumentSchema = z.union([RaumDokumentV1Schema, RaumDokumentV2Schema, RaumDokumentV3Schema]);

export type RaumDokument = z.infer<typeof RaumDokumentSchema>;

/**
 * Validierte Migration auf die aktuelle Version (ADR-0003): V1-Dokumente
 * haben garantiert `objekte: []` — dort hebt die Migration nur die
 * Versionsmarke. V2-Dokumente erhalten deterministisch erzeugte Sitzplätze
 * für ihre Tischobjekte. Das Ergebnis wird erneut gegen den V3-Vertrag
 * validiert.
 */
export function migriereRaumDokument(doc: RaumDokument): RaumDokumentV3 {
  if (doc.version === AKTUELLE_DOKUMENT_VERSION) {
    return doc as RaumDokumentV3;
  }
  return RaumDokumentV3Schema.parse({
    version: AKTUELLE_DOKUMENT_VERSION,
    breiteCm: doc.breiteCm,
    laengeCm: doc.laengeCm,
    rasterCm: doc.rasterCm,
    objekte: doc.objekte,
    sitzplaetze: doc.objekte.flatMap((o) => erzeugeSitzplaetze(o)),
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
