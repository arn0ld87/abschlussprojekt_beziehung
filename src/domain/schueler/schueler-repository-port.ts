import { Schueler } from './schueler';

export interface SchuelerRepository {
  findAllByKlasseId(klasseId: string): Promise<Schueler[]>;
  findById(id: string): Promise<Schueler | null>;
  create(data: Omit<Schueler, 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Schueler>;
  update(id: string, data: Partial<Omit<Schueler, 'id' | 'klasseId' | 'createdAt'>> & { updatedAt: Date }): Promise<Schueler>;
  softDelete(id: string): Promise<void>;
}
