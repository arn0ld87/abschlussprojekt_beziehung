import { Sitzregel } from './sitzregel';

export interface SitzregelRepository {
  findAllBySchuelerId(schuelerId: string): Promise<Sitzregel[]>;
  findAllByKlasseId(klasseId: string): Promise<Sitzregel[]>;
  findById(id: string): Promise<Sitzregel | null>;
  create(data: Omit<Sitzregel, 'createdAt' | 'updatedAt'>): Promise<Sitzregel>;
  update(id: string, data: Partial<Omit<Sitzregel, 'id' | 'schuelerId' | 'klasseId' | 'createdAt'>> & { updatedAt: Date }): Promise<Sitzregel>;
  delete(id: string): Promise<void>;
}
