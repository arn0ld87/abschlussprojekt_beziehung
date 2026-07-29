import type { Foto } from "./foto-model";

export interface FotoRepositoryPort {
  findBySchuelerId(schuelerId: string): Promise<Foto | null>;
  create(foto: Foto): Promise<Foto>;
  deleteBySchuelerId(schuelerId: string): Promise<void>;
}
