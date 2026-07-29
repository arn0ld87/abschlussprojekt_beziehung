import { SitzregelRepository, Sitzregel } from '../../domain/sitzregel';

export class InMemorySitzregelRepository implements SitzregelRepository {
  private sitzregelMap = new Map<string, Sitzregel>();

  async findAllBySchuelerId(schuelerId: string): Promise<Sitzregel[]> {
    return Array.from(this.sitzregelMap.values()).filter((r) => r.schuelerId === schuelerId);
  }

  async findAllByKlasseId(klasseId: string): Promise<Sitzregel[]> {
    return Array.from(this.sitzregelMap.values()).filter((r) => r.klasseId === klasseId);
  }

  async findById(id: string): Promise<Sitzregel | null> {
    return this.sitzregelMap.get(id) || null;
  }

  async create(data: Omit<Sitzregel, 'createdAt' | 'updatedAt'>): Promise<Sitzregel> {
    const now = new Date();
    const newRegel: Sitzregel = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.sitzregelMap.set(data.id, newRegel);
    return newRegel;
  }

  async update(
    id: string,
    data: Partial<Omit<Sitzregel, 'id' | 'schuelerId' | 'klasseId' | 'createdAt'>> & { updatedAt: Date }
  ): Promise<Sitzregel> {
    const existing = this.sitzregelMap.get(id);
    if (!existing) throw new Error(`Sitzregel with id ${id} not found.`);
    const updated: Sitzregel = {
      ...existing,
      ...data,
    };
    this.sitzregelMap.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.sitzregelMap.delete(id);
  }

  clear(): void {
    this.sitzregelMap.clear();
  }
}
