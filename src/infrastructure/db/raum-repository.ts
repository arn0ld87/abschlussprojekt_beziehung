import { eq, and, isNull, desc } from 'drizzle-orm';
import { getDb } from './client';
import { raeume } from './schema';
import { RaumRepository, Raum, RaumDokumentV1 } from '../../domain/raum';

export class DrizzleRaumRepository implements RaumRepository {
  async findAllByUserId(userId: string): Promise<Raum[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(raeume)
      .where(and(eq(raeume.userId, userId), isNull(raeume.deletedAt)))
      .orderBy(desc(raeume.updatedAt));
    return rows;
  }

  async findById(id: string): Promise<Raum | null> {
    const db = getDb();
    const rows = await db.select().from(raeume).where(eq(raeume.id, id));
    return rows[0] || null;
  }

  async create(data: {
    id: string;
    name: string;
    userId: string;
    breiteCm: number;
    laengeCm: number;
    rasterCm: number;
    dokumentVersion: number;
    canvasDocument: RaumDokumentV1;
  }): Promise<Raum> {
    const db = getDb();
    const [row] = await db.insert(raeume).values(data).returning();
    return row;
  }

  async update(id: string, data: {
    name?: string;
    breiteCm?: number;
    laengeCm?: number;
    rasterCm?: number;
    canvasDocument?: RaumDokumentV1;
    updatedAt: Date;
  }): Promise<Raum> {
    const db = getDb();
    const [row] = await db.update(raeume).set(data).where(eq(raeume.id, id)).returning();
    return row;
  }

  async softDelete(id: string): Promise<void> {
    const db = getDb();
    await db.update(raeume).set({ deletedAt: new Date() }).where(eq(raeume.id, id));
  }
}
