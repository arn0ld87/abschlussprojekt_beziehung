import { RaumRepository, Raum, RaumDokumentV1 } from '../../domain/raum';

type CreateData = {
  id: string;
  name: string;
  userId: string;
  breiteCm: number;
  laengeCm: number;
  rasterCm: number;
  dokumentVersion: number;
  canvasDocument: RaumDokumentV1;
};

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

  async create(data: CreateData): Promise<Raum> {
    const raum: Raum = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    this.raeume.set(data.id, raum);
    return raum;
  }

  async update(id: string, data: {
    name?: string;
    breiteCm?: number;
    laengeCm?: number;
    rasterCm?: number;
    canvasDocument?: RaumDokumentV1;
    updatedAt: Date;
  }): Promise<Raum> {
    const existing = this.raeume.get(id);
    if (!existing) throw new Error('Not found');

    const updated: Raum = {
      ...existing,
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
