import { SchuelerRepository, Schueler } from '../../domain/schueler';

export class InMemorySchuelerRepository implements SchuelerRepository {
  private schuelerMap = new Map<string, Schueler>();

  async findAllByKlasseId(klasseId: string): Promise<Schueler[]> {
    return Array.from(this.schuelerMap.values())
      .filter((s) => s.klasseId === klasseId && !s.deletedAt)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }

  async findById(id: string): Promise<Schueler | null> {
    const s = this.schuelerMap.get(id);
    return s || null;
  }

  async create(data: Omit<Schueler, 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Schueler> {
    const now = new Date();
    const newSchueler: Schueler = {
      ...data,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.schuelerMap.set(data.id, newSchueler);
    return newSchueler;
  }

  async update(
    id: string,
    data: Partial<Omit<Schueler, 'id' | 'klasseId' | 'createdAt'>> & { updatedAt: Date }
  ): Promise<Schueler> {
    const existing = this.schuelerMap.get(id);
    if (!existing) throw new Error(`Schueler with id ${id} not found.`);
    const updated: Schueler = {
      ...existing,
      ...data,
    };
    this.schuelerMap.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const existing = this.schuelerMap.get(id);
    if (existing) {
      existing.deletedAt = new Date();
      this.schuelerMap.set(id, existing);
    }
  }

  clear(): void {
    this.schuelerMap.clear();
  }
}
