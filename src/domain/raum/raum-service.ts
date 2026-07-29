import { randomUUID } from 'node:crypto';
import { CreateRaumInputSchema, UpdateRaumInputSchema, RaumDokumentV1Schema, Raum, RaumDokumentV1 } from './raum';
import { RaumRepository } from './raum-repository-port';

export class RaumError extends Error {
  constructor(public code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_ERROR', message: string) {
    super(message);
    this.name = 'RaumError';
  }
}

export class RaumService {
  constructor(private readonly repository: RaumRepository) {}

  async list(userId: string): Promise<Raum[]> {
    return this.repository.findAllByUserId(userId);
  }

  async getById(userId: string, raumId: string): Promise<Raum> {
    const raum = await this.repository.findById(raumId);
    if (!raum || raum.deletedAt) {
      throw new RaumError('NOT_FOUND', 'Raum nicht gefunden.');
    }
    if (raum.userId !== userId) {
      throw new RaumError('FORBIDDEN', 'Keine Berechtigung für diesen Raum.');
    }
    return raum;
  }

  async create(userId: string, input: unknown): Promise<Raum> {
    const parsed = CreateRaumInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new RaumError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const canvasDocument = this.buildDokument(parsed.data.breiteCm, parsed.data.laengeCm, parsed.data.rasterCm);
    const id = `raum_${randomUUID()}`;
    return this.repository.create({
      id,
      name: parsed.data.name,
      userId,
      breiteCm: parsed.data.breiteCm,
      laengeCm: parsed.data.laengeCm,
      rasterCm: parsed.data.rasterCm,
      dokumentVersion: 1,
      canvasDocument,
    });
  }

  async update(userId: string, raumId: string, input: unknown): Promise<Raum> {
    const parsed = UpdateRaumInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new RaumError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const existing = await this.getById(userId, raumId); // Checks existence & ownership

    // Jeder Schreibvorgang validiert auch das bereits persistierte Dokument
    // erneut — so überlebt kein malformed/alter JSONB-Stand einen Write.
    const bestehendesDokument = RaumDokumentV1Schema.safeParse(existing.canvasDocument);
    if (!bestehendesDokument.success) {
      throw new RaumError('VALIDATION_ERROR', 'Persistiertes Raumdokument ist ungültig oder veraltet.');
    }

    const breiteCm = parsed.data.breiteCm ?? existing.breiteCm;
    const laengeCm = parsed.data.laengeCm ?? existing.laengeCm;
    const rasterCm = parsed.data.rasterCm ?? existing.rasterCm;
    if (rasterCm > Math.min(breiteCm, laengeCm)) {
      throw new RaumError('VALIDATION_ERROR', 'Raster darf die kleinere Raumseite nicht überschreiten.');
    }

    const masseGeaendert =
      parsed.data.breiteCm !== undefined || parsed.data.laengeCm !== undefined || parsed.data.rasterCm !== undefined;

    // Bei Maß-Änderungen werden alle gemergten Dimensionen atomar zusammen
    // mit dem Dokument geschrieben — niemals Spalten und Dokument auseinanderlaufen lassen.
    return this.repository.update(raumId, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(masseGeaendert
        ? { breiteCm, laengeCm, rasterCm, canvasDocument: this.buildDokument(breiteCm, laengeCm, rasterCm) }
        : {}),
      updatedAt: new Date(),
    });
  }

  async delete(userId: string, raumId: string): Promise<void> {
    await this.getById(userId, raumId); // Checks existence & ownership
    await this.repository.softDelete(raumId);
  }

  // Jeder Schreibvorgang validiert das JSONB-Dokument erneut gegen den
  // versionsgebundenen Zod-Vertrag (ADR-0003).
  private buildDokument(breiteCm: number, laengeCm: number, rasterCm: number): RaumDokumentV1 {
    return RaumDokumentV1Schema.parse({
      version: 1,
      breiteCm,
      laengeCm,
      rasterCm,
      objekte: [],
    });
  }
}
