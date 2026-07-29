import { randomUUID } from 'node:crypto';
import { CreateSitzregelInputSchema, UpdateSitzregelInputSchema, Sitzregel } from './sitzregel';
import { SitzregelRepository } from './sitzregel-repository-port';
import { SchuelerService } from '../schueler';
import { KlassenService } from '../klasse';

export class SitzregelError extends Error {
  constructor(public code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_ERROR', message: string) {
    super(message);
    this.name = 'SitzregelError';
  }
}

export class SitzregelService {
  constructor(
    private readonly repository: SitzregelRepository,
    private readonly schuelerService: SchuelerService,
    private readonly klassenService: KlassenService
  ) {}

  async listForSchueler(userId: string, klasseId: string, schuelerId: string): Promise<Sitzregel[]> {
    await this.schuelerService.getById(userId, klasseId, schuelerId);
    return this.repository.findAllBySchuelerId(schuelerId);
  }

  async listForKlasse(userId: string, klasseId: string): Promise<Sitzregel[]> {
    await this.klassenService.getById(userId, klasseId);
    return this.repository.findAllByKlasseId(klasseId);
  }

  async create(
    userId: string,
    klasseId: string,
    schuelerId: string,
    input: unknown
  ): Promise<Sitzregel> {
    await this.schuelerService.getById(userId, klasseId, schuelerId);

    const parsed = CreateSitzregelInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new SitzregelError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const { typ, targetSchuelerId, haerte, gewicht } = parsed.data;

    if (targetSchuelerId) {
      if (targetSchuelerId === schuelerId) {
        throw new SitzregelError('VALIDATION_ERROR', 'Ein Schüler kann nicht mit sich selbst geregelt werden.');
      }
      const target = await this.schuelerService.getById(userId, klasseId, targetSchuelerId);
      if (target.klasseId !== klasseId) {
        throw new SitzregelError('VALIDATION_ERROR', 'Ziel-Schüler gehört nicht zu dieser Klasse.');
      }
    }

    // Check duplicate rules
    const existingKlasseRules = await this.repository.findAllByKlasseId(klasseId);
    for (const rule of existingKlasseRules) {
      if (rule.typ === typ) {
        if (typ === 'front_seat' || typ === 'quiet_area') {
          if (rule.schuelerId === schuelerId) {
            throw new SitzregelError('VALIDATION_ERROR', `Der Schüler hat bereits eine ${typ}-Regel.`);
          }
        } else if (typ === 'near_to' || typ === 'away_from') {
          // Symmetric check: (schuelerId, target) or (target, schuelerId)
          const samePair =
            (rule.schuelerId === schuelerId && rule.targetSchuelerId === targetSchuelerId) ||
            (rule.schuelerId === targetSchuelerId && rule.targetSchuelerId === schuelerId);
          if (samePair) {
            throw new SitzregelError('VALIDATION_ERROR', `Es existiert bereits eine ${typ}-Regel für diese beiden Schüler.`);
          }
        }
      }
    }

    const id = `stz_${randomUUID()}`;
    return this.repository.create({
      id,
      schuelerId,
      klasseId,
      typ,
      targetSchuelerId: targetSchuelerId ?? null,
      haerte,
      gewicht: haerte === 'hard' ? null : (gewicht ?? null),
    });
  }

  async update(
    userId: string,
    klasseId: string,
    schuelerId: string,
    regelId: string,
    input: unknown
  ): Promise<Sitzregel> {
    await this.schuelerService.getById(userId, klasseId, schuelerId);

    const existing = await this.repository.findById(regelId);
    if (!existing) {
      throw new SitzregelError('NOT_FOUND', 'Sitzregel nicht gefunden.');
    }
    if (existing.schuelerId !== schuelerId || existing.klasseId !== klasseId) {
      throw new SitzregelError('FORBIDDEN', 'Keine Berechtigung für diese Sitzregel.');
    }

    const parsed = UpdateSitzregelInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new SitzregelError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const newTyp = parsed.data.typ ?? existing.typ;
    const newTarget = parsed.data.targetSchuelerId !== undefined ? parsed.data.targetSchuelerId : existing.targetSchuelerId;
    const newHaerte = parsed.data.haerte ?? existing.haerte;

    let newGewicht: number | null = existing.gewicht;
    if (newHaerte === 'hard') {
      newGewicht = null;
    } else if (parsed.data.gewicht !== undefined) {
      newGewicht = parsed.data.gewicht;
    }

    if (newTarget) {
      if (newTarget === schuelerId) {
        throw new SitzregelError('VALIDATION_ERROR', 'Ein Schüler kann nicht mit sich selbst geregelt werden.');
      }
      await this.schuelerService.getById(userId, klasseId, newTarget);
    }

    return this.repository.update(regelId, {
      typ: newTyp,
      targetSchuelerId: newTarget,
      haerte: newHaerte,
      gewicht: newGewicht,
      updatedAt: new Date(),
    });
  }

  async delete(userId: string, klasseId: string, schuelerId: string, regelId: string): Promise<void> {
    await this.schuelerService.getById(userId, klasseId, schuelerId);

    const existing = await this.repository.findById(regelId);
    if (!existing) {
      throw new SitzregelError('NOT_FOUND', 'Sitzregel nicht gefunden.');
    }
    if (existing.schuelerId !== schuelerId || existing.klasseId !== klasseId) {
      throw new SitzregelError('FORBIDDEN', 'Keine Berechtigung für diese Sitzregel.');
    }

    await this.repository.delete(regelId);
  }
}
