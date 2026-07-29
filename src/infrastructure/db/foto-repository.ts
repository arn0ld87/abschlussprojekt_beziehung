import { eq } from "drizzle-orm";
import type { FotoRepositoryPort } from "../../domain/foto/foto-repository-port";
import type { Foto } from "../../domain/foto/foto-model";
import { getDb } from "./client";
import { fotos } from "./schema";

export class FotoRepository implements FotoRepositoryPort {
  async findBySchuelerId(schuelerId: string): Promise<Foto | null> {
    const result = await getDb().select().from(fotos).where(eq(fotos.schuelerId, schuelerId));
    if (result.length === 0) return null;
    return result[0];
  }

  async create(foto: Foto): Promise<Foto> {
    const result = await getDb().insert(fotos).values(foto).returning();
    return result[0];
  }

  async deleteBySchuelerId(schuelerId: string): Promise<void> {
    await getDb().delete(fotos).where(eq(fotos.schuelerId, schuelerId));
  }
}
