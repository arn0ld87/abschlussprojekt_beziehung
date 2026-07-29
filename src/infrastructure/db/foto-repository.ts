import { eq } from "drizzle-orm";
import type { FotoRepositoryPort } from "../../domain/foto/foto-repository-port";
import { FotoSchema, type Foto } from "../../domain/foto/foto-model";
import { getDb } from "./client";
import { fotos } from "./schema";

/**
 * Drizzle liefert text-Spalten ohne Enum-Einschraenkung. Wir validieren die
 * Rueckgabe gegen die Domain-Allowlist (Zod), damit die Domain-Typen nicht
 * durch die Infrastruktur "aufgeweicht" werden.
 */
function toFoto(row: typeof fotos.$inferSelect): Foto {
  return FotoSchema.parse({
    id: row.id,
    schuelerId: row.schuelerId,
    internerDateiname: row.internerDateiname,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    breitePx: row.breitePx ?? null,
    hoehePx: row.hoehePx ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  });
}

export class FotoRepository implements FotoRepositoryPort {
  async findBySchuelerId(schuelerId: string): Promise<Foto | null> {
    const result = await getDb().select().from(fotos).where(eq(fotos.schuelerId, schuelerId));
    if (result.length === 0) return null;
    return toFoto(result[0]);
  }

  async create(foto: Foto): Promise<Foto> {
    const result = await getDb()
      .insert(fotos)
      .values({
        id: foto.id,
        schuelerId: foto.schuelerId,
        internerDateiname: foto.internerDateiname,
        mimeType: foto.mimeType,
        byteSize: foto.byteSize,
        breitePx: foto.breitePx ?? null,
        hoehePx: foto.hoehePx ?? null,
        createdAt: foto.createdAt,
        updatedAt: foto.updatedAt,
        deletedAt: foto.deletedAt ?? null,
      })
      .returning();
    return toFoto(result[0]);
  }

  async deleteBySchuelerId(schuelerId: string): Promise<void> {
    await getDb().delete(fotos).where(eq(fotos.schuelerId, schuelerId));
  }
}
