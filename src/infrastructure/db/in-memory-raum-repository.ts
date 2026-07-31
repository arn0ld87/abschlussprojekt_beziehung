import { RaumRepository, RaumCreateData, RaumUpdateData, Raum } from '../../domain/raum';

export class InMemoryRaumRepository implements RaumRepository {
  private raeume = new Map<string, Raum>();

  async findAllByUserId(userId: string): Promise<Raum[]> {
    return Array.from(this.raeume.values())
      .filter((r) => r.userId === userId && !r.deletedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async findById(id: string): Promise<Raum | null> {
    return this.raeume.get(id) || null;
  }

  async create(data: RaumCreateData): Promise<Raum> {
    const raum: Raum = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    this.raeume.set(data.id, raum);
    return raum;
  }

  update(id: string, data: RaumUpdateData): Promise<Raum>;
  update(id: string, data: RaumUpdateData, erwartetUpdatedAt: Date): Promise<Raum | null>;
  async update(id: string, data: RaumUpdateData, erwartetUpdatedAt?: Date): Promise<Raum | null> {
    const existing = this.raeume.get(id);
    if (erwartetUpdatedAt) {
      // Compare-and-Swap: fehlender oder zwischenzeitlich geänderter Stand
      // lässt das Update fehlschlagen, statt Änderungen still zu verwerfen.
      if (!existing || new Date(existing.updatedAt).getTime() !== erwartetUpdatedAt.getTime()) {
        return null;
      }
    } else if (!existing) {
      throw new Error('Not found');
    }

    const updated: Raum = {
      ...existing!,
      ...data,
      updatedAt: data.updatedAt,
    };
    this.raeume.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const existing = this.raeume.get(id);
    if (!existing) return;
    this.raeume.set(id, { ...existing, deletedAt: new Date() });
  }

  // Helper for tests
  clear() {
    this.raeume.clear();
  }
}
