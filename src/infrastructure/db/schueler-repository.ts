import { eq, and, isNull, asc } from 'drizzle-orm';
import { getDb } from './client';
import { schueler } from './schema';
import { SchuelerRepository, Schueler } from '../../domain/schueler';

export class DrizzleSchuelerRepository implements SchuelerRepository {
  async findAllByKlasseId(klasseId: string): Promise<Schueler[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(schueler)
      .where(and(eq(schueler.klasseId, klasseId), isNull(schueler.deletedAt)))
      .orderBy(asc(schueler.name));
    return rows;
  }

  async findById(id: string): Promise<Schueler | null> {
    const db = getDb();
    const rows = await db.select().from(schueler).where(eq(schueler.id, id));
    return rows[0] || null;
  }

  async create(data: Omit<Schueler, 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Schueler> {
    const db = getDb();
    const [row] = await db
      .insert(schueler)
      .values({
        id: data.id,
        klasseId: data.klasseId,
        name: data.name,
        initialen: data.initialen,
        farbe: data.farbe,
        lernstand: data.lernstand,
        verhalten: data.verhalten,
        freitextnotizen: data.freitextnotizen,
        fotoPlaceholderId: data.fotoPlaceholderId,
      })
      .returning();
    return row;
  }

  async update(
    id: string,
    data: Partial<Omit<Schueler, 'id' | 'klasseId' | 'createdAt'>> & { updatedAt: Date }
  ): Promise<Schueler> {
    const db = getDb();
    const updatePayload: Record<string, unknown> = { ...data };
    const [row] = await db.update(schueler).set(updatePayload).where(eq(schueler.id, id)).returning();
    return row;
  }

  async softDelete(id: string): Promise<void> {
    const db = getDb();
    await db.update(schueler).set({ deletedAt: new Date() }).where(eq(schueler.id, id));
  }
}
