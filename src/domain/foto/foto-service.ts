import { randomUUID } from "node:crypto";
import {
  FotoSchema,
  MAX_PHOTO_BYTES,
  isAllowedMimeType,
  matchesMagicBytes,
  type Foto,
} from "./foto-model";
import type { FotoRepositoryPort } from "./foto-repository-port";
import type { DateiPort } from "./datei-port";

export class FotoServiceError extends Error {
  constructor(
    public code:
      | "NOT_FOUND"
      | "VALIDATION_ERROR"
      | "UNSUPPORTED_MEDIA_TYPE"
      | "PAYLOAD_TOO_LARGE"
      | "UPLOAD_ERROR",
    message: string
  ) {
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
    // 1. MIME-Type auf Allowlist pruefen (JPEG/PNG/WebP).
    if (!isAllowedMimeType(datei.type)) {
      throw new FotoServiceError(
        "UNSUPPORTED_MEDIA_TYPE",
        "Nur JPEG, PNG und WebP sind erlaubt."
      );
    }

    // 2. Groessenlimit.
    if (datei.size <= 0) {
      throw new FotoServiceError("VALIDATION_ERROR", "Datei ist leer.");
    }
    if (datei.size > MAX_PHOTO_BYTES) {
      throw new FotoServiceError(
        "PAYLOAD_TOO_LARGE",
        `Das Bild darf maximal ${MAX_PHOTO_BYTES / 1024 / 1024}MB gross sein.`
      );
    }

    // 3. Magic-Bytes stichprobenartig pruefen (Issue Akzeptanzkriterium).
    const arrayBuffer = await datei.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (!matchesMagicBytes(bytes, datei.type)) {
      throw new FotoServiceError(
        "UNSUPPORTED_MEDIA_TYPE",
        "Dateiinhalt passt nicht zum angegebenen Bildformat."
      );
    }

    // 4. Neuen Speicherpfad erzeugen BEVOR wir alte Dateien loeschen.
    const neuerPfad = await this.dateiPort.speichere(schuelerId, datei);

    // 5. Bestehendes Foto ermitteln — fuer Kompensation bei Fehlschlag.
    const existierendesFoto = await this.repository.findBySchuelerId(schuelerId);

    // 6. Kompensation: Wenn der DB-Insert fehlschlaegt, neue Datei wieder loeschen.
    let neuesFoto: Foto;
    try {
      neuesFoto = FotoSchema.parse({
        id: `fot_${randomUUID()}`,
        schuelerId,
        internerDateiname: neuerPfad,
        mimeType: datei.type,
        byteSize: datei.size,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err) {
      await this.dateiPort.loesche(neuerPfad).catch(() => undefined);
      throw new FotoServiceError(
        "VALIDATION_ERROR",
        err instanceof Error ? err.message : "Foto-Daten ungueltig."
      );
    }

    let persistiert: Foto;
    try {
      persistiert = await this.repository.create(neuesFoto);
    } catch (err) {
      await this.dateiPort.loesche(neuerPfad).catch(() => undefined);
      throw new FotoServiceError(
        "UPLOAD_ERROR",
        err instanceof Error ? err.message : "Persistierung fehlgeschlagen."
      );
    }

    // 7. Erst NACH erfolgreichem Insert alte Datei loeschen (Replace-Compensation).
    //    Wenn das Loeschen scheitert, bleibt die alte Datei liegen; das ist
    //    akzeptabel, weil die DB keine Referenz mehr darauf haelt.
    if (existierendesFoto) {
      await this.dateiPort.loesche(existierendesFoto.internerDateiname).catch(() => undefined);
      await this.repository
        .deleteBySchuelerId(schuelerId)
        .catch(() => undefined);
    }

    return persistiert;
  }

  async deleteFoto(schuelerId: string): Promise<void> {
    const foto = await this.repository.findBySchuelerId(schuelerId);
    if (!foto) {
      return;
    }
    // DB-Eintrag zuerst entfernen, dann Datei. Falls Dateiloeschen fehlschlaegt,
    // bleibt die Datei liegen (kein DB-Verweis mehr -> kein Sicherheitsrisiko).
    await this.repository.deleteBySchuelerId(schuelerId);
    await this.dateiPort.loesche(foto.internerDateiname).catch(() => undefined);
  }

  async getFotoDatei(internerDateiname: string): Promise<Buffer | null> {
    return this.dateiPort.lese(internerDateiname);
  }
}
