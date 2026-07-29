import { randomUUID } from "node:crypto";
import type { Foto } from "./foto-model";
import type { FotoRepositoryPort } from "./foto-repository-port";
import type { DateiPort } from "./datei-port";

export class FotoServiceError extends Error {
  constructor(public code: "NOT_FOUND" | "VALIDATION_ERROR" | "UPLOAD_ERROR", message: string) {
    super(message);
    this.name = "FotoServiceError";
  }
}

export class FotoService {
  constructor(
    private readonly repository: FotoRepositoryPort,
    private readonly dateiPort: DateiPort
  ) {}

  async getFotoBySchuelerId(schuelerId: string): Promise<Foto | null> {
    return this.repository.findBySchuelerId(schuelerId);
  }

  async uploadFoto(schuelerId: string, datei: File): Promise<Foto> {
    if (!datei.type.startsWith("image/")) {
      throw new FotoServiceError("VALIDATION_ERROR", "Nur Bilder sind erlaubt.");
    }
    if (datei.size > 5 * 1024 * 1024) {
      throw new FotoServiceError("VALIDATION_ERROR", "Das Bild darf maximal 5MB groß sein.");
    }

    const existierendesFoto = await this.repository.findBySchuelerId(schuelerId);
    if (existierendesFoto) {
      await this.deleteFoto(schuelerId);
    }

    const pfad = await this.dateiPort.speichere(schuelerId, datei);

    const neuesFoto: Foto = {
      id: `fot_${randomUUID()}`,
      schuelerId,
      pfad,
      mimeType: datei.type,
      groesse: datei.size,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.repository.create(neuesFoto);
  }

  async deleteFoto(schuelerId: string): Promise<void> {
    const foto = await this.repository.findBySchuelerId(schuelerId);
    if (!foto) {
      throw new FotoServiceError("NOT_FOUND", "Foto nicht gefunden.");
    }

    await this.dateiPort.loesche(foto.pfad);
    await this.repository.deleteBySchuelerId(schuelerId);
  }

  async getFotoDatei(pfad: string): Promise<Buffer | null> {
    return this.dateiPort.lese(pfad);
  }
}
