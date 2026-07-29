import { KlassenRepository, Klasse } from '../../domain/klasse';

export class InMemoryKlassenRepository implements KlassenRepository {
  private klassen = new Map<string, Klasse>();

  async findAllByUserId(userId: string): Promise<Klasse[]> {
    return Array.from(this.klassen.values())
      .filter((k) => k.userId === userId && !k.deletedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async findById(id: string): Promise<Klasse | null> {
    return this.klassen.get(id) || null;
  }

  async create(data: { id: string; name: string; notizen: string | null; userId: string }): Promise<Klasse> {
    const klasse: Klasse = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    this.klassen.set(data.id, klasse);
    return klasse;
  }

  async update(id: string, data: { name?: string; notizen?: string | null; updatedAt: Date }): Promise<Klasse> {
    const existing = this.klassen.get(id);
    if (!existing) throw new Error('Not found');

    const updated: Klasse = {
      ...existing,
      ...data,
      updatedAt: data.updatedAt,
    };
    this.klassen.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const existing = this.klassen.get(id);
    if (!existing) return;
    this.klassen.set(id, { ...existing, deletedAt: new Date() });
  }

  // Helper for tests
  clear() {
    this.klassen.clear();
  }
}
