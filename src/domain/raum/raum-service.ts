import { randomUUID } from 'node:crypto';
import {
  AKTUELLE_DOKUMENT_VERSION,
  CreateRaumInputSchema,
  UpdateRaumInputSchema,
  RaumDokumentSchema,
  RaumDokumentV2Schema,
  Raum,
  RaumDokumentV2,
  migriereRaumDokument,
} from './raum';
import { RaumRepository } from './raum-repository-port';
import {
  AddRaumObjektInputSchema,
  RaumObjektV1,
  STANDARD_OBJEKTE,
  istObjektImRaum,
  startPosition,
} from './objekte';
import { BewegeObjektInputSchema, bewegeObjektAufRaster } from './interaktion';
import { berechneDuplikatPosition, entferneObjekt, rotiereObjekt } from './aktionen';

export class RaumError extends Error {
  constructor(public code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_ERROR' | 'CONFLICT', message: string) {
    super(message);
    this.name = 'RaumError';
  }
}

export class RaumService {
  constructor(private readonly repository: RaumRepository) {}

  async list(userId: string): Promise<Raum[]> {
    return this.repository.findAllByUserId(userId);
  }

  async getById(userId: string, raumId: string): Promise<Raum> {
    const raum = await this.repository.findById(raumId);
    if (!raum || raum.deletedAt) {
      throw new RaumError('NOT_FOUND', 'Raum nicht gefunden.');
    }
    if (raum.userId !== userId) {
      throw new RaumError('FORBIDDEN', 'Keine Berechtigung für diesen Raum.');
    }
    return raum;
  }

  async create(userId: string, input: unknown): Promise<Raum> {
    const parsed = CreateRaumInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new RaumError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const canvasDocument = this.buildDokument(parsed.data.breiteCm, parsed.data.laengeCm, parsed.data.rasterCm);
    const id = `raum_${randomUUID()}`;
    return this.repository.create({
      id,
      name: parsed.data.name,
      userId,
      breiteCm: parsed.data.breiteCm,
      laengeCm: parsed.data.laengeCm,
      rasterCm: parsed.data.rasterCm,
      dokumentVersion: AKTUELLE_DOKUMENT_VERSION,
      canvasDocument,
    });
  }

  async update(userId: string, raumId: string, input: unknown): Promise<Raum> {
    const parsed = UpdateRaumInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new RaumError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const existing = await this.getById(userId, raumId); // Checks existence & ownership

    // Jeder Schreibvorgang validiert das persistierte Dokument gegen den
    // Lese-Vertrag und migriert es validiert auf die aktuelle Version —
    // so überlebt kein malformed/alter JSONB-Stand einen Write (ADR-0003).
    const dokument = this.lesenUndMigrieren(existing.canvasDocument);

    const breiteCm = parsed.data.breiteCm ?? existing.breiteCm;
    const laengeCm = parsed.data.laengeCm ?? existing.laengeCm;
    const rasterCm = parsed.data.rasterCm ?? existing.rasterCm;
    if (rasterCm > Math.min(breiteCm, laengeCm)) {
      throw new RaumError('VALIDATION_ERROR', 'Raster darf die kleinere Raumseite nicht überschreiten.');
    }

    const masseGeaendert =
      parsed.data.breiteCm !== undefined || parsed.data.laengeCm !== undefined || parsed.data.rasterCm !== undefined;

    // Maßänderungen dürfen keine bestehenden Objekte verlieren oder aus dem
    // Raum schieben — sonst wäre das gemergte Dokument ungültig.
    if (masseGeaendert) {
      const draussen = dokument.objekte.filter((o) => !istObjektImRaum(o, breiteCm, laengeCm));
      if (draussen.length > 0) {
        throw new RaumError(
          'VALIDATION_ERROR',
          'Die neuen Maße würden bestehende Objekte aus dem Raum schieben.',
        );
      }
    }

    // Bei Maß-Änderungen werden alle gemergten Dimensionen atomar zusammen
    // mit dem Dokument geschrieben — niemals Spalten und Dokument auseinanderlaufen lassen.
    return this.repository.update(raumId, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(masseGeaendert
        ? {
            breiteCm,
            laengeCm,
            rasterCm,
            dokumentVersion: AKTUELLE_DOKUMENT_VERSION,
            canvasDocument: this.buildDokument(breiteCm, laengeCm, rasterCm, dokument.objekte),
          }
        : {}),
      updatedAt: new Date(),
    });
  }

  /**
   * Fügt ein Standardobjekt aus der Möbelpalette hinzu (M2 #51): validierte
   * Objektart, UUID-ID, Standardmaße und geklemmte Startposition. Das komplette
   * Dokument wird erneut gegen den Vertrag validiert und atomar geschrieben.
   */
  async addObjekt(userId: string, raumId: string, input: unknown): Promise<Raum> {
    const parsed = AddRaumObjektInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new RaumError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const existing = await this.getById(userId, raumId); // Checks existence & ownership
    const dokument = this.lesenUndMigrieren(existing.canvasDocument);

    const std = STANDARD_OBJEKTE[parsed.data.typ];

    // Passt das Standardobjekt gar nicht in den Raum, ist das ein fachlicher
    // Validierungsfehler — kein Schema-Unfall (stabiler 422 statt 500).
    if (std.breiteCm > dokument.breiteCm || std.tiefeCm > dokument.laengeCm) {
      throw new RaumError(
        'VALIDATION_ERROR',
        `${std.label} passt mit ${std.breiteCm} × ${std.tiefeCm} cm nicht in diesen Raum.`,
      );
    }

    const pos = startPosition(parsed.data.typ, dokument.breiteCm, dokument.laengeCm);

    // UUID-IDs; Kollisionen innerhalb des Dokuments werden ausgeschlossen.
    const id = this.neueObjektId(new Set(dokument.objekte.map((o) => o.id)));

    const objekt: RaumObjektV1 = {
      id,
      typ: parsed.data.typ,
      x_cm: pos.x_cm,
      y_cm: pos.y_cm,
      breite_cm: std.breiteCm,
      tiefe_cm: std.tiefeCm,
      rotation_deg: std.rotationDeg,
    };

    const validiert = RaumDokumentV2Schema.safeParse({
      ...dokument,
      objekte: [...dokument.objekte, objekt],
    });
    if (!validiert.success) {
      throw new RaumError('VALIDATION_ERROR', validiert.error.errors[0].message);
    }

    return this.repository.update(raumId, {
      dokumentVersion: AKTUELLE_DOKUMENT_VERSION,
      canvasDocument: validiert.data,
      updatedAt: new Date(),
    });
  }

  /**
   * Verschiebt ein Objekt nach abgeschlossener Drag-Interaktion (M2 #52):
   * Die Zielposition wird serverseitig auf das Dokumentraster gerundet und
   * auf die Raumgrenzen begrenzt (rotationsbereinigt). Persistiert wird erst,
   * nachdem das komplette Dokument erneut validiert wurde — schlägt die
   * Validierung fehl, bleibt der bisherige bestätigte Stand unverändert.
   */
  async bewegeObjekt(userId: string, raumId: string, objektId: string, input: unknown): Promise<Raum> {
    const parsed = BewegeObjektInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new RaumError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const existing = await this.getById(userId, raumId); // Checks existence & ownership
    const dokument = this.lesenUndMigrieren(existing.canvasDocument);

    const index = dokument.objekte.findIndex((o) => o.id === objektId);
    if (index === -1) {
      throw new RaumError('NOT_FOUND', 'Objekt nicht gefunden.');
    }

    const ziel = bewegeObjektAufRaster(
      dokument.objekte[index],
      parsed.data.x_cm,
      parsed.data.y_cm,
      dokument.rasterCm,
      dokument.breiteCm,
      dokument.laengeCm,
    );

    const objekte = dokument.objekte.map((o, i) => (i === index ? { ...o, x_cm: ziel.x_cm, y_cm: ziel.y_cm } : o));

    const validiert = RaumDokumentV2Schema.safeParse({ ...dokument, objekte });
    if (!validiert.success) {
      throw new RaumError('VALIDATION_ERROR', validiert.error.errors[0].message);
    }

    return this.repository.update(raumId, {
      dokumentVersion: AKTUELLE_DOKUMENT_VERSION,
      canvasDocument: validiert.data,
      updatedAt: new Date(),
    });
  }

  /**
   * Dreht ein Objekt um 90° im Uhrzeigersinn (M2 #53). Passt das gedrehte
   * Objekt nicht mehr vollständig in den Raum, wird mit VALIDATION_ERROR
   * abgelehnt und der bestätigte Stand bleibt unverändert.
   */
  async rotiereObjekt(userId: string, raumId: string, objektId: string): Promise<Raum> {
    const dokument = await this.ladeDokumentFuerObjekt(userId, raumId, objektId);
    const gedreht = rotiereObjekt(dokument.objekte[dokument.index]);
    return this.schreibeObjekte(raumId, dokument.dokument, gedreht, dokument.index, dokument.updatedAt);
  }

  /**
   * Dupliziert ein Objekt mit neuer UUID und rasterversetzter, freier und
   * gültiger Position (M2 #53). Findet sich keine vom Original abweichende
   * Position ohne Überlappung, wird verständlich abgelehnt — kein
   * ungültiges Dokument wird gespeichert.
   */
  async dupliziereObjekt(userId: string, raumId: string, objektId: string): Promise<Raum> {
    const dokument = await this.ladeDokumentFuerObjekt(userId, raumId, objektId);
    const original = dokument.objekte[dokument.index];

    const ziel = berechneDuplikatPosition(
      original,
      dokument.dokument.objekte,
      dokument.dokument.rasterCm,
      dokument.dokument.breiteCm,
      dokument.dokument.laengeCm,
    );
    if (!ziel) {
      throw new RaumError(
        'VALIDATION_ERROR',
        'Kein freier Platz für ein Duplikat — alle Rasterpositionen um das Objekt sind belegt oder außerhalb des Raums.',
      );
    }

    const id = this.neueObjektId(new Set(dokument.dokument.objekte.map((o) => o.id)));

    const duplikat: RaumObjektV1 = { ...original, id, x_cm: ziel.x_cm, y_cm: ziel.y_cm };
    return this.schreibeObjekte(raumId, dokument.dokument, duplikat, undefined, dokument.updatedAt);
  }

  /**
   * Entfernt genau das ausgewählte Objekt aus dem Dokument (M2 #53).
   */
  async entferneObjekt(userId: string, raumId: string, objektId: string): Promise<Raum> {
    const dokument = await this.ladeDokumentFuerObjekt(userId, raumId, objektId);
    const objekte = entferneObjekt(dokument.dokument.objekte, objektId);
    return this.schreibeObjekte(raumId, dokument.dokument, objekte, undefined, dokument.updatedAt);
  }

  async delete(userId: string, raumId: string): Promise<void> {
    await this.getById(userId, raumId); // Checks existence & ownership
    await this.repository.softDelete(raumId);
  }

  // Lädt das migrierte Dokument und den Index des Zielobjekts — mit
  // Ownership-Prüfung und NOT_FOUND für unbekannte Objekte. updatedAt des
  // gelesenen Stands wird für den optimistischen Compare-and-Swap beim
  // Schreiben weitergereicht.
  private async ladeDokumentFuerObjekt(userId: string, raumId: string, objektId: string) {
    const existing = await this.getById(userId, raumId); // Checks existence & ownership
    const dokument = this.lesenUndMigrieren(existing.canvasDocument);
    const index = dokument.objekte.findIndex((o) => o.id === objektId);
    if (index === -1) {
      throw new RaumError('NOT_FOUND', 'Objekt nicht gefunden.');
    }
    return { dokument, objekte: dokument.objekte, index, updatedAt: new Date(existing.updatedAt) };
  }

  // Validiert das Dokument mit geänderter Objektliste erneut und schreibt es
  // atomar. Varianten: ein Objekt an Index ersetzen, eines anhängen oder eine
  // komplette Liste übergeben. Der Schreibvorgang erfolgt als atomarer
  // Compare-and-Swap über updatedAt des zuvor gelesenen Stands: Hat ein
  // paralleler Request den Datensatz zwischenzeitlich geändert, schlägt das
  // Update fehl und es wird ein stabiler CONFLICT-Fehler gemeldet — keine
  // scheinbar erfolgreiche Mutation, die fremde Änderungen verwirft.
  private async schreibeObjekte(
    raumId: string,
    dokument: RaumDokumentV2,
    aenderung: RaumObjektV1 | RaumObjektV1[],
    index: number | undefined,
    erwartetUpdatedAt: Date,
  ): Promise<Raum> {
    const objekte = Array.isArray(aenderung)
      ? aenderung
      : index !== undefined
        ? dokument.objekte.map((o, i) => (i === index ? aenderung : o))
        : [...dokument.objekte, aenderung];

    const validiert = RaumDokumentV2Schema.safeParse({ ...dokument, objekte });
    if (!validiert.success) {
      throw new RaumError('VALIDATION_ERROR', validiert.error.errors[0].message);
    }

    const aktualisiert = await this.repository.update(
      raumId,
      {
        dokumentVersion: AKTUELLE_DOKUMENT_VERSION,
        canvasDocument: validiert.data,
        updatedAt: new Date(),
      },
      erwartetUpdatedAt,
    );
    if (!aktualisiert) {
      throw new RaumError(
        'CONFLICT',
        'Der Raum wurde zwischenzeitlich geändert — bitte neu laden und die Aktion wiederholen.',
      );
    }
    return aktualisiert;
  }

  // Erzeugt eine kollisionsfreie obj_-ID innerhalb des Dokuments.
  private neueObjektId(vorhandeneIds: Set<string>): string {
    let id = `obj_${randomUUID()}`;
    while (vorhandeneIds.has(id)) {
      id = `obj_${randomUUID()}`;
    }
    return id;
  }

  // Jeder Schreibvorgang validiert das JSONB-Dokument erneut gegen den
  // versionsgebundenen Zod-Vertrag (ADR-0003).
  private buildDokument(
    breiteCm: number,
    laengeCm: number,
    rasterCm: number,
    objekte: RaumObjektV1[] = [],
  ): RaumDokumentV2 {
    return RaumDokumentV2Schema.parse({
      version: AKTUELLE_DOKUMENT_VERSION,
      breiteCm,
      laengeCm,
      rasterCm,
      objekte,
    });
  }

  // Liest ein persistiertes Dokument jeder bekannten Version und migriert es
  // validiert auf die aktuelle Version (ADR-0003).
  private lesenUndMigrieren(canvasDocument: unknown): RaumDokumentV2 {
    const parsed = RaumDokumentSchema.safeParse(canvasDocument);
    if (!parsed.success) {
      throw new RaumError('VALIDATION_ERROR', 'Persistiertes Raumdokument ist ungültig oder veraltet.');
    }
    return migriereRaumDokument(parsed.data);
  }
}
