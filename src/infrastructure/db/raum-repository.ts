import { eq, and, isNull, desc } from 'drizzle-orm';
import { getDb } from './client';
import { raeume } from './schema';
import { RaumRepository, RaumCreateData, RaumUpdateData, Raum } from '../../domain/raum';

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

  async create(data: RaumCreateData): Promise<Raum> {
    const db = getDb();
    const [row] = await db.insert(raeume).values(data).returning();
    return row;
  }

  update(id: string, data: RaumUpdateData): Promise<Raum>;
  update(id: string, data: RaumUpdateData, erwartetUpdatedAt: Date): Promise<Raum | null>;
  async update(id: string, data: RaumUpdateData, erwartetUpdatedAt?: Date): Promise<Raum | null> {
    const db = getDb();
    // Compare-and-Swap: Die updatedAt-Bedingung wandert atomar in dasselbe
    // UPDATE-Statement — ein paralleler Write dazwischen lässt die Bedingung
    // fehlschlagen (0 Zeilen) statt Änderungen still zu verwerfen.
    const bedingung = erwartetUpdatedAt
      ? and(eq(raeume.id, id), eq(raeume.updatedAt, erwartetUpdatedAt))
      : eq(raeume.id, id);
    const [row] = await db.update(raeume).set(data).where(bedingung).returning();
    return row ?? null;
  }

  async softDelete(id: string): Promise<void> {
    const db = getDb();
    await db.update(raeume).set({ deletedAt: new Date() }).where(eq(raeume.id, id));
  }
}
