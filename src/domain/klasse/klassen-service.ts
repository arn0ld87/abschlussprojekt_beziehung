import { randomUUID } from 'node:crypto';
import { CreateKlasseInputSchema, UpdateKlasseInputSchema, Klasse } from './klasse';
import { KlassenRepository } from './klassen-repository-port';

export class KlasseError extends Error {
  constructor(public code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_ERROR', message: string) {
    super(message);
    this.name = 'KlasseError';
  }
}

export class KlassenService {
  constructor(private readonly repository: KlassenRepository) {}

  async list(userId: string): Promise<Klasse[]> {
    return this.repository.findAllByUserId(userId);
  }

  async getById(userId: string, klasseId: string): Promise<Klasse> {
    const klasse = await this.repository.findById(klasseId);
    if (!klasse || klasse.deletedAt) {
      throw new KlasseError('NOT_FOUND', 'Klasse nicht gefunden.');
    }
    if (klasse.userId !== userId) {
      throw new KlasseError('FORBIDDEN', 'Keine Berechtigung für diese Klasse.');
    }
    return klasse;
  }

  async create(userId: string, input: unknown): Promise<Klasse> {
    const parsed = CreateKlasseInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new KlasseError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const id = `kls_${randomUUID()}`;
    return this.repository.create({
      id,
      name: parsed.data.name,
      notizen: parsed.data.notizen ?? null,
      userId,
    });
  }

  async update(userId: string, klasseId: string, input: unknown): Promise<Klasse> {
    const parsed = UpdateKlasseInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new KlasseError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    await this.getById(userId, klasseId); // Checks existence & ownership

    return this.repository.update(klasseId, {
      ...parsed.data,
      updatedAt: new Date(),
    });
  }

  async delete(userId: string, klasseId: string): Promise<void> {
    await this.getById(userId, klasseId); // Checks existence & ownership
    await this.repository.softDelete(klasseId);
  }
}
