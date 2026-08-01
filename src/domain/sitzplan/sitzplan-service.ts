import { randomUUID } from 'node:crypto';
import { KlasseError, KlassenService } from '../klasse';
import { RaumDokumentV3, RaumError, RaumService, migriereRaumDokument } from '../raum';
import { Schueler, SchuelerService } from '../schueler';
import {
  AKTUELLE_SITZPLAN_DOKUMENT_VERSION,
  CreateSitzplanInputSchema,
  SetzeZuordnungenInputSchema,
  Sitzplan,
  SitzplanDokumentV1,
  SitzplanDokumentV1Schema,
  UpdateSitzplanInputSchema,
} from './sitzplan';
import { SitzplanRepository } from './sitzplan-repository-port';
import { ZuordnungBefund, ermittleBefunde, sortiereZuordnungen } from './zuordnung-commands';

export type SitzplanErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_ERROR';

export class SitzplanError extends Error {
  constructor(public code: SitzplanErrorCode, message: string) {
    super(message);
    this.name = 'SitzplanError';
  }
}

// Fremde Fehlercodes werden auf den Sitzplan-Kontext abgebildet, ohne die
// Meldung der Quelldomäne durchzureichen — der Aufrufer erfährt, welche
// Quelle des Sitzplans betroffen ist, nicht wie das Klassen- oder Raummodul
// intern formuliert.
function quellenFehler(code: string, quelle: 'Klasse' | 'Raumvorlage'): SitzplanError {
  if (code === 'FORBIDDEN') {
    return new SitzplanError('FORBIDDEN', `Keine Berechtigung für die angegebene ${quelle}.`);
  }
  if (code === 'VALIDATION_ERROR') {
    return new SitzplanError('VALIDATION_ERROR', `Die angegebene ${quelle} ist ungültig.`);
  }
  return new SitzplanError('NOT_FOUND', `Die angegebene ${quelle} existiert nicht oder wurde gelöscht.`);
}

/**
 * Ladeansicht des Editors (M3 #57). Ablage und Belegung sind abgeleitet, nicht
 * persistiert: Sie entstehen aus dem aktiven Klassenbestand und den
 * Zuordnungen des Plandokuments. `befunde` meldet Zuordnungen auf inzwischen
 * nicht mehr aktive Schülerprofile — als Diagnose neben dem Plan, nicht als
 * Ladefehler.
 */
export interface SitzplanAnsicht {
  sitzplan: Sitzplan;
  ablage: Schueler[];
  belegung: Array<{ sitzplatzId: string; schueler: Schueler }>;
  befunde: ZuordnungBefund[];
}

export class SitzplanService {
  constructor(
    private readonly repository: SitzplanRepository,
    private readonly klassenService: KlassenService,
    private readonly raumService: RaumService,
    private readonly schuelerService: SchuelerService,
  ) {}

  async list(userId: string): Promise<Sitzplan[]> {
    return this.repository.findAllByUserId(userId);
  }

  async getById(userId: string, sitzplanId: string): Promise<Sitzplan> {
    const sitzplan = await this.repository.findById(sitzplanId);
    if (!sitzplan || sitzplan.deletedAt) {
      throw new SitzplanError('NOT_FOUND', 'Sitzplan nicht gefunden.');
    }
    if (sitzplan.userId !== userId) {
      throw new SitzplanError('FORBIDDEN', 'Keine Berechtigung für diesen Sitzplan.');
    }
    return sitzplan;
  }

  /**
   * Verbindet genau eine eigene Klasse mit genau einer eigenen Raumvorlage.
   * Die validierte Raumgeometrie wird in ein versioniertes
   * `SitzplanDokumentV1` kopiert (ADR-0003) — der Plan ist danach von der
   * Vorlage entkoppelt und überlebt deren Änderung oder Soft-Delete.
   */
  async create(userId: string, input: unknown): Promise<Sitzplan> {
    const parsed = CreateSitzplanInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new SitzplanError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    // Existenz, Eigentümerschaft und Soft-Delete-Zustand beider Quellen
    // werden nicht dupliziert, sondern von den zuständigen Diensten geprüft.
    const klasse = await this.klassenService.getById(userId, parsed.data.klasseId).catch((err) => {
      if (err instanceof KlasseError) throw quellenFehler(err.code, 'Klasse');
      throw err;
    });
    const raum = await this.raumService.getById(userId, parsed.data.raumId).catch((err) => {
      if (err instanceof RaumError) throw quellenFehler(err.code, 'Raumvorlage');
      throw err;
    });

    // Migration auf die aktuelle Raumdokumentversion, damit ein Plan
    // unabhängig vom persistierten Rohstand immer vollständige Sitzplätze
    // einfriert.
    const vorlage = migriereRaumDokument(raum.canvasDocument);

    const canvasDocument = this.buildDokument(klasse.id, raum.id, vorlage);
    const id = `plan_${randomUUID()}`;

    return this.repository.create({
      id,
      name: parsed.data.name,
      userId,
      klasseId: klasse.id,
      raumId: raum.id,
      revision: 1,
      dokumentVersion: AKTUELLE_SITZPLAN_DOKUMENT_VERSION,
      canvasDocument,
    });
  }

  /**
   * Umbenennen. Die Revision bleibt unverändert: Sie zählt den Serverstand
   * des Plandokuments und wird erst vom Autosave-Slice (M3 #59) fortgeschrieben.
   */
  async update(userId: string, sitzplanId: string, input: unknown): Promise<Sitzplan> {
    const parsed = UpdateSitzplanInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new SitzplanError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    await this.getById(userId, sitzplanId); // Checks existence & ownership

    return this.repository.update(sitzplanId, {
      name: parsed.data.name,
      updatedAt: new Date(),
    });
  }

  /**
   * Schreibt die Schülerzuordnung als vollständiges, erneut validiertes
   * Plandokument (M3 #57). Der Client sendet ausschließlich die Zuordnungen;
   * Geometrie und Quelle bleiben eingefroren.
   *
   * Serverseitig erzwungen — die Bedienoberfläche ist kein Schutzmechanismus:
   * Eigentümerschaft am Plan, Klassenzugehörigkeit jedes Schülerprofils und
   * dessen Soft-Delete-Zustand. Die drei harten Zuordnungs-Invarianten
   * (bekannter Sitzplatz, höchstens ein Schüler je Platz, höchstens ein Platz
   * je Schüler) prüft der Zod-Vertrag.
   *
   * Ohne Debounce-Autosave und ohne Revisionsfortschreibung — beides gehört
   * zu M3 #59 (ADR-0004).
   */
  async setzeZuordnungen(userId: string, sitzplanId: string, input: unknown): Promise<Sitzplan> {
    const parsed = SetzeZuordnungenInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new SitzplanError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const sitzplan = await this.getById(userId, sitzplanId); // Checks existence & ownership

    // Klassenzugehörigkeit und Soft-Delete: `list` liefert ausschließlich
    // aktive Schülerprofile genau dieser Klasse und prüft dabei zugleich die
    // Eigentümerschaft an der Klasse. Ist die Quellklasse selbst gelöscht,
    // bleibt der Bestand leer.
    const aktive = await this.aktiveSchueler(userId, sitzplan.klasseId);

    // Neu zugeordnet werden dürfen ausschließlich aktive Schülerprofile dieser
    // Klasse. Bereits im Dokument stehende Schülerprofile bleiben zulässig,
    // auch wenn sie inzwischen soft-gelöscht oder verschoben wurden: Sonst
    // ließe sich ein Altbestand mit mehreren veralteten Zuordnungen nie
    // aufräumen, weil schon der erste Speichervorgang an den übrigen
    // scheitern würde. Der Inkonsistenzbefund macht diese Einträge sichtbar;
    // neu entstehen können sie über diesen Pfad nicht.
    const erlaubteIds = new Set([
      ...aktive.map((s) => s.id),
      ...sitzplan.canvasDocument.zuordnungen.map((z) => z.schuelerId),
    ]);

    for (const zuordnung of parsed.data.zuordnungen) {
      if (!erlaubteIds.has(zuordnung.schuelerId)) {
        throw new SitzplanError(
          'VALIDATION_ERROR',
          'Nur aktive Schülerprofile der Klasse dieses Sitzplans dürfen zugeordnet werden.',
        );
      }
    }

    const validiert = SitzplanDokumentV1Schema.safeParse({
      ...sitzplan.canvasDocument,
      zuordnungen: sortiereZuordnungen(parsed.data.zuordnungen),
    });
    if (!validiert.success) {
      throw new SitzplanError('VALIDATION_ERROR', validiert.error.errors[0].message);
    }

    return this.repository.update(sitzplanId, {
      canvasDocument: validiert.data,
      updatedAt: new Date(),
    });
  }

  /**
   * Lädt den Plan zusammen mit abgeleiteter Ablage, Belegung und
   * Inkonsistenzbefunden. Ein Befund verhindert das Laden nie — er wird als
   * Diagnose neben dem Plan geliefert.
   */
  async ansicht(userId: string, sitzplanId: string): Promise<SitzplanAnsicht> {
    const sitzplan = await this.getById(userId, sitzplanId); // Checks existence & ownership
    const aktive = await this.aktiveSchueler(userId, sitzplan.klasseId);
    const nachId = new Map(aktive.map((s) => [s.id, s]));
    const zuordnungen = sitzplan.canvasDocument.zuordnungen;
    const sitzend = new Set(zuordnungen.map((z) => z.schuelerId));

    const belegung = zuordnungen
      .map((z) => ({ sitzplatzId: z.sitzplatzId, schueler: nachId.get(z.schuelerId) }))
      .filter((eintrag): eintrag is { sitzplatzId: string; schueler: Schueler } => eintrag.schueler !== undefined);

    return {
      sitzplan,
      ablage: aktive.filter((s) => !sitzend.has(s.id)),
      belegung,
      befunde: ermittleBefunde(zuordnungen, aktive.map((s) => s.id)),
    };
  }

  /**
   * Aktive Schülerprofile der Quellklasse. Eine soft-gelöschte oder fremde
   * Klasse ist kein Ladefehler des Plans: Der Plan überlebt das Löschen seiner
   * Quellen (ADR-0003), der Bestand ist dann eben leer.
   */
  private async aktiveSchueler(userId: string, klasseId: string): Promise<Schueler[]> {
    return this.schuelerService.list(userId, klasseId).catch((err) => {
      // Nur fachliche Klassenfehler (gelöscht, fremd, unbekannt) werden zu
      // einem leeren Bestand. Infrastrukturfehler bleiben Fehler.
      if (err instanceof KlasseError) return [];
      throw err;
    });
  }

  async delete(userId: string, sitzplanId: string): Promise<void> {
    await this.getById(userId, sitzplanId); // Checks existence & ownership
    await this.repository.softDelete(sitzplanId);
  }

  // Jeder Schreibvorgang validiert das JSONB-Dokument vor der Persistenz
  // gegen den versionsgebundenen Zod-Vertrag (ADR-0003). Die Geometrie wird
  // dabei tief kopiert, damit der eingefrorene Stand keine Referenzen auf
  // das Vorlagendokument behält.
  private buildDokument(klasseId: string, raumId: string, vorlage: RaumDokumentV3): SitzplanDokumentV1 {
    return SitzplanDokumentV1Schema.parse({
      version: AKTUELLE_SITZPLAN_DOKUMENT_VERSION,
      quelle: { klasseId, raumId },
      raumGeometrie: structuredClone({
        breiteCm: vorlage.breiteCm,
        laengeCm: vorlage.laengeCm,
        rasterCm: vorlage.rasterCm,
        objekte: vorlage.objekte,
        sitzplaetze: vorlage.sitzplaetze,
      }),
      zuordnungen: [],
    });
  }
}
