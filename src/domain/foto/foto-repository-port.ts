import type { Foto } from "./foto-model";

export interface FotoAenderungen {
  internerDateiname: string;
  mimeType: string;
  byteSize: number;
  updatedAt: Date;
}

export interface FotoRepositoryPort {
  findBySchuelerId(schuelerId: string): Promise<Foto | null>;
  create(foto: Foto): Promise<Foto>;
  /**
   * Aktualisiert den Metadaten-Satz des Fotos eines Schuelers atomar.
   * Wird beim Replace verwendet, damit der Unique-Constraint auf schueler_id
   * nicht durch einen zweiten Insert verletzt wird. Wirft, wenn noch kein
   * Foto-Eintrag existiert.
   */
  updateBySchuelerId(schuelerId: string, aenderungen: FotoAenderungen): Promise<Foto>;
  deleteBySchuelerId(schuelerId: string): Promise<void>;
}
