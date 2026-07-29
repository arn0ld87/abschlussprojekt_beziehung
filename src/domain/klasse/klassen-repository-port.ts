import { Klasse } from './klasse';

export interface KlassenRepository {
  findAllByUserId(userId: string): Promise<Klasse[]>;
  findById(id: string): Promise<Klasse | null>;
  create(data: { id: string; name: string; notizen: string | null; userId: string }): Promise<Klasse>;
  update(id: string, data: { name?: string; notizen?: string | null; updatedAt: Date }): Promise<Klasse>;
  softDelete(id: string): Promise<void>;
}
