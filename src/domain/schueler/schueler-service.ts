import { randomUUID } from 'node:crypto';
import { CreateSchuelerInputSchema, UpdateSchuelerInputSchema, Schueler, autoGenerateInitialen, DEFAULT_FARBEN } from './schueler';
import { SchuelerRepository } from './schueler-repository-port';
import { KlassenService } from '../klasse';

export class SchuelerError extends Error {
  constructor(public code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_ERROR', message: string) {
    super(message);
    this.name = 'SchuelerError';
  }
}

export class SchuelerService {
  constructor(
    private readonly repository: SchuelerRepository,
    private readonly klassenService: KlassenService
  ) {}

  async list(userId: string, klasseId: string): Promise<Schueler[]> {
    await this.klassenService.getById(userId, klasseId);
    const list = await this.repository.findAllByKlasseId(klasseId);
    return list.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }

  async getById(userId: string, klasseId: string, schuelerId: string): Promise<Schueler> {
    await this.klassenService.getById(userId, klasseId);
    const schueler = await this.repository.findById(schuelerId);
    if (!schueler || schueler.deletedAt) {
      throw new SchuelerError('NOT_FOUND', 'Schüler nicht gefunden.');
    }
    if (schueler.klasseId !== klasseId) {
      throw new SchuelerError('FORBIDDEN', 'Schüler gehört nicht zu dieser Klasse.');
    }
    return schueler;
  }

  async create(userId: string, klasseId: string, input: unknown): Promise<Schueler> {
    await this.klassenService.getById(userId, klasseId);

    const parsed = CreateSchuelerInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new SchuelerError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const id = `sch_${randomUUID()}`;
    const initialen = parsed.data.initialen || autoGenerateInitialen(parsed.data.name);
    const farbe = parsed.data.farbe || DEFAULT_FARBEN[Math.floor(Math.random() * DEFAULT_FARBEN.length)];

    return this.repository.create({
      id,
      klasseId,
      name: parsed.data.name,
      initialen,
      farbe,
      lernstand: parsed.data.lernstand ?? null,
      verhalten: parsed.data.verhalten ?? null,
      freitextnotizen: parsed.data.freitextnotizen ?? null,
      fotoPlaceholderId: parsed.data.fotoPlaceholderId ?? null,
    });
  }

  async update(userId: string, klasseId: string, schuelerId: string, input: unknown): Promise<Schueler> {
    await this.getById(userId, klasseId, schuelerId);

    const parsed = UpdateSchuelerInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new SchuelerError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.name && !parsed.data.initialen) {
      updateData.initialen = autoGenerateInitialen(parsed.data.name);
    }

    return this.repository.update(schuelerId, {
      ...updateData,
      updatedAt: new Date(),
    });
  }

  async delete(userId: string, klasseId: string, schuelerId: string): Promise<void> {
    await this.getById(userId, klasseId, schuelerId);
    await this.repository.softDelete(schuelerId);
  }
}
