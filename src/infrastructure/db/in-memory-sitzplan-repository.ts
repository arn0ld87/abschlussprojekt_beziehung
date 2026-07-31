import {
  Sitzplan,
  SitzplanCreateData,
  SitzplanRepository,
  SitzplanUpdateData,
} from '../../domain/sitzplan';

export class InMemorySitzplanRepository implements SitzplanRepository {
  private sitzplaene = new Map<string, Sitzplan>();

  async findAllByUserId(userId: string): Promise<Sitzplan[]> {
    return Array.from(this.sitzplaene.values())
      .filter((p) => p.userId === userId && !p.deletedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async findById(id: string): Promise<Sitzplan | null> {
    return this.sitzplaene.get(id) || null;
  }

  async create(data: SitzplanCreateData): Promise<Sitzplan> {
    const sitzplan: Sitzplan = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    this.sitzplaene.set(data.id, sitzplan);
    return sitzplan;
  }

  async update(id: string, data: SitzplanUpdateData): Promise<Sitzplan> {
    const existing = this.sitzplaene.get(id);
    if (!existing) throw new Error('Not found');

    const updated: Sitzplan = {
      ...existing,
      ...data,
      updatedAt: data.updatedAt,
    };
    this.sitzplaene.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const existing = this.sitzplaene.get(id);
    if (!existing) return;
    this.sitzplaene.set(id, { ...existing, deletedAt: new Date() });
  }

  // Helper for tests
  clear() {
    this.sitzplaene.clear();
  }
}
