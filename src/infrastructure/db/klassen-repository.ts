import { eq, and, isNull, desc } from 'drizzle-orm';
import { getDb } from './client';
import { klassen } from './schema';
import { KlassenRepository } from '../../domain/klasse';
import { Klasse } from '../../domain/klasse';

export class DrizzleKlassenRepository implements KlassenRepository {
  async findAllByUserId(userId: string): Promise<Klasse[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(klassen)
      .where(and(eq(klassen.userId, userId), isNull(klassen.deletedAt)))
      .orderBy(desc(klassen.updatedAt));
    return rows;
  }

  async findById(id: string): Promise<Klasse | null> {
    const db = getDb();
    const rows = await db.select().from(klassen).where(eq(klassen.id, id));
    return rows[0] || null;
  }

  async create(data: { id: string; name: string; notizen: string | null; userId: string }): Promise<Klasse> {
    const db = getDb();
    const [row] = await db.insert(klassen).values({
      id: data.id,
      name: data.name,
      notizen: data.notizen,
      userId: data.userId,
    }).returning();
    return row;
  }

  async update(id: string, data: { name?: string; notizen?: string | null; updatedAt: Date }): Promise<Klasse> {
    const db = getDb();
    const [row] = await db.update(klassen).set(data).where(eq(klassen.id, id)).returning();
    return row;
  }

  async softDelete(id: string): Promise<void> {
    const db = getDb();
    await db.update(klassen).set({ deletedAt: new Date() }).where(eq(klassen.id, id));
  }
}
