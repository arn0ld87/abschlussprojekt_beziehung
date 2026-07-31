import { eq, and, isNull, desc } from 'drizzle-orm';
import { getDb } from './client';
import { sitzplaene } from './schema';
import {
  Sitzplan,
  SitzplanCreateData,
  SitzplanRepository,
  SitzplanUpdateData,
} from '../../domain/sitzplan';

export class DrizzleSitzplanRepository implements SitzplanRepository {
  async findAllByUserId(userId: string): Promise<Sitzplan[]> {
    const db = getDb();
    return db
      .select()
      .from(sitzplaene)
      .where(and(eq(sitzplaene.userId, userId), isNull(sitzplaene.deletedAt)))
      .orderBy(desc(sitzplaene.updatedAt));
  }

  async findById(id: string): Promise<Sitzplan | null> {
    const db = getDb();
    const rows = await db.select().from(sitzplaene).where(eq(sitzplaene.id, id));
    return rows[0] || null;
  }

  async create(data: SitzplanCreateData): Promise<Sitzplan> {
    const db = getDb();
    const [row] = await db.insert(sitzplaene).values(data).returning();
    return row;
  }

  async update(id: string, data: SitzplanUpdateData): Promise<Sitzplan> {
    const db = getDb();
    const [row] = await db.update(sitzplaene).set(data).where(eq(sitzplaene.id, id)).returning();
    return row;
  }

  async softDelete(id: string): Promise<void> {
    const db = getDb();
    await db.update(sitzplaene).set({ deletedAt: new Date() }).where(eq(sitzplaene.id, id));
  }
}
