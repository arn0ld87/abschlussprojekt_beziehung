import { randomUUID } from 'node:crypto';
import { KlasseError, KlassenService } from '../klasse';
import { RaumDokumentV3, RaumError, RaumService, migriereRaumDokument } from '../raum';
import {
  AKTUELLE_SITZPLAN_DOKUMENT_VERSION,
  CreateSitzplanInputSchema,
  Sitzplan,
  SitzplanDokumentV1,
  SitzplanDokumentV1Schema,
  UpdateSitzplanInputSchema,
} from './sitzplan';
import { SitzplanRepository } from './sitzplan-repository-port';

export type SitzplanErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_ERROR';

export class SitzplanError extends Error {
  constructor(public code: SitzplanErrorCode, message: string) {
    super(message);
    this.name = 'SitzplanError';
  }
}

// Fremde Fehlercodes werden auf den Sitzplan-Kontext abgebildet, ohne die
// Meldung der Quelldomäne durchzureichen — der Aufrufer erfährt, welche
// Quelle des Sitzplans betroffen ist, nicht wie das Klassen- oder Raummodul
// intern formuliert.
function quellenFehler(code: string, quelle: 'Klasse' | 'Raumvorlage'): SitzplanError {
  if (code === 'FORBIDDEN') {
    return new SitzplanError('FORBIDDEN', `Keine Berechtigung für die angegebene ${quelle}.`);
  }
  if (code === 'VALIDATION_ERROR') {
    return new SitzplanError('VALIDATION_ERROR', `Die angegebene ${quelle} ist ungültig.`);
  }
  return new SitzplanError('NOT_FOUND', `Die angegebene ${quelle} existiert nicht oder wurde gelöscht.`);
}

export class SitzplanService {
  constructor(
    private readonly repository: SitzplanRepository,
    private readonly klassenService: KlassenService,
    private readonly raumService: RaumService,
  ) {}

  async list(userId: string): Promise<Sitzplan[]> {
    return this.repository.findAllByUserId(userId);
  }

  async getById(userId: string, sitzplanId: string): Promise<Sitzplan> {
    const sitzplan = await this.repository.findById(sitzplanId);
    if (!sitzplan || sitzplan.deletedAt) {
      throw new SitzplanError('NOT_FOUND', 'Sitzplan nicht gefunden.');
    }
    if (sitzplan.userId !== userId) {
      throw new SitzplanError('FORBIDDEN', 'Keine Berechtigung für diesen Sitzplan.');
    }
    return sitzplan;
  }

  /**
   * Verbindet genau eine eigene Klasse mit genau einer eigenen Raumvorlage.
   * Die validierte Raumgeometrie wird in ein versioniertes
   * `SitzplanDokumentV1` kopiert (ADR-0003) — der Plan ist danach von der
   * Vorlage entkoppelt und überlebt deren Änderung oder Soft-Delete.
   */
  async create(userId: string, input: unknown): Promise<Sitzplan> {
    const parsed = CreateSitzplanInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new SitzplanError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    // Existenz, Eigentümerschaft und Soft-Delete-Zustand beider Quellen
    // werden nicht dupliziert, sondern von den zuständigen Diensten geprüft.
    const klasse = await this.klassenService.getById(userId, parsed.data.klasseId).catch((err) => {
      if (err instanceof KlasseError) throw quellenFehler(err.code, 'Klasse');
      throw err;
    });
    const raum = await this.raumService.getById(userId, parsed.data.raumId).catch((err) => {
      if (err instanceof RaumError) throw quellenFehler(err.code, 'Raumvorlage');
      throw err;
    });

    // Migration auf die aktuelle Raumdokumentversion, damit ein Plan
    // unabhängig vom persistierten Rohstand immer vollständige Sitzplätze
    // einfriert.
    const vorlage = migriereRaumDokument(raum.canvasDocument);

    const canvasDocument = this.buildDokument(klasse.id, raum.id, vorlage);
    const id = `plan_${randomUUID()}`;

    return this.repository.create({
      id,
      name: parsed.data.name,
      userId,
      klasseId: klasse.id,
      raumId: raum.id,
      revision: 1,
      dokumentVersion: AKTUELLE_SITZPLAN_DOKUMENT_VERSION,
      canvasDocument,
    });
  }

  /**
   * Umbenennen. Die Revision bleibt unverändert: Sie zählt den Serverstand
   * des Plandokuments und wird erst vom Autosave-Slice (M3 #59) fortgeschrieben.
   */
  async update(userId: string, sitzplanId: string, input: unknown): Promise<Sitzplan> {
    const parsed = UpdateSitzplanInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new SitzplanError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    await this.getById(userId, sitzplanId); // Checks existence & ownership

    return this.repository.update(sitzplanId, {
      name: parsed.data.name,
      updatedAt: new Date(),
    });
  }

  async delete(userId: string, sitzplanId: string): Promise<void> {
    await this.getById(userId, sitzplanId); // Checks existence & ownership
    await this.repository.softDelete(sitzplanId);
  }

  // Jeder Schreibvorgang validiert das JSONB-Dokument vor der Persistenz
  // gegen den versionsgebundenen Zod-Vertrag (ADR-0003). Die Geometrie wird
  // dabei tief kopiert, damit der eingefrorene Stand keine Referenzen auf
  // das Vorlagendokument behält.
  private buildDokument(klasseId: string, raumId: string, vorlage: RaumDokumentV3): SitzplanDokumentV1 {
    return SitzplanDokumentV1Schema.parse({
      version: AKTUELLE_SITZPLAN_DOKUMENT_VERSION,
      quelle: { klasseId, raumId },
      raumGeometrie: structuredClone({
        breiteCm: vorlage.breiteCm,
        laengeCm: vorlage.laengeCm,
        rasterCm: vorlage.rasterCm,
        objekte: vorlage.objekte,
        sitzplaetze: vorlage.sitzplaetze,
      }),
      zuordnungen: [],
    });
  }
}
