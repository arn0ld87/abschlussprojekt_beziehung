import { eq } from 'drizzle-orm';
import { getDb } from './client';
import { sitzregeln } from './schema';
import { SitzregelRepository, Sitzregel, SitzregelTyp, SitzregelHaerte } from '../../domain/sitzregel';

export class DrizzleSitzregelRepository implements SitzregelRepository {
  async findAllBySchuelerId(schuelerId: string): Promise<Sitzregel[]> {
    const db = getDb();
    const rows = await db.select().from(sitzregeln).where(eq(sitzregeln.schuelerId, schuelerId));
    return rows.map(this.mapRowToDomain);
  }

  async findAllByKlasseId(klasseId: string): Promise<Sitzregel[]> {
    const db = getDb();
    const rows = await db.select().from(sitzregeln).where(eq(sitzregeln.klasseId, klasseId));
    return rows.map(this.mapRowToDomain);
  }

  async findById(id: string): Promise<Sitzregel | null> {
    const db = getDb();
    const rows = await db.select().from(sitzregeln).where(eq(sitzregeln.id, id));
    return rows[0] ? this.mapRowToDomain(rows[0]) : null;
  }

  async create(data: Omit<Sitzregel, 'createdAt' | 'updatedAt'>): Promise<Sitzregel> {
    const db = getDb();
    const [row] = await db
      .insert(sitzregeln)
      .values({
        id: data.id,
        schuelerId: data.schuelerId,
        klasseId: data.klasseId,
        typ: data.typ,
        targetSchuelerId: data.targetSchuelerId,
        haerte: data.haerte,
        gewicht: data.gewicht,
      })
      .returning();
    return this.mapRowToDomain(row);
  }

  async update(
    id: string,
    data: Partial<Omit<Sitzregel, 'id' | 'schuelerId' | 'klasseId' | 'createdAt'>> & { updatedAt: Date }
  ): Promise<Sitzregel> {
    const db = getDb();
    const [row] = await db.update(sitzregeln).set(data).where(eq(sitzregeln.id, id)).returning();
    return this.mapRowToDomain(row);
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.delete(sitzregeln).where(eq(sitzregeln.id, id));
  }

  private mapRowToDomain(row: {
    id: string;
    schuelerId: string;
    klasseId: string;
    typ: string;
    targetSchuelerId: string | null;
    haerte: string;
    gewicht: number | null;
    createdAt: Date;
    updatedAt: Date;
  }): Sitzregel {
    return {
      ...row,
      typ: row.typ as SitzregelTyp,
      haerte: row.haerte as SitzregelHaerte,
    };
  }
}
