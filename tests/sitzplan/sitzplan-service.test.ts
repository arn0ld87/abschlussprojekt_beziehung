import { describe, it, expect, beforeEach } from 'vitest';
import { KlassenService } from '../../src/domain/klasse';
import { RaumService, migriereRaumDokument } from '../../src/domain/raum';
import {
  SitzplanService,
  SitzplanError,
  AKTUELLE_SITZPLAN_DOKUMENT_VERSION,
  SitzplanDokumentV1Schema,
} from '../../src/domain/sitzplan';
import { InMemoryKlassenRepository } from '../../src/infrastructure/db/in-memory-klassen-repository';
import { InMemoryRaumRepository } from '../../src/infrastructure/db/in-memory-raum-repository';
import { InMemorySchuelerRepository } from '../../src/infrastructure/db/in-memory-schueler-repository';
import { InMemorySitzplanRepository } from '../../src/infrastructure/db/in-memory-sitzplan-repository';
import { SchuelerService } from '../../src/domain/schueler';

// Sitzplan-Grundlage (M3 #56): Klasse und Raumvorlage werden zu einem
// persistenten Plan verbunden. Die Raumgeometrie wird beim Anlegen in ein
// versioniertes SitzplanDokumentV1 eingefroren (ADR-0003) — spätere
// Vorlagenänderungen verändern bestehende Pläne nicht rückwirkend.
describe('SitzplanService (M3 #56)', () => {
  let klassenService: KlassenService;
  let raumService: RaumService;
  let sitzplanRepository: InMemorySitzplanRepository;
  let sitzplanService: SitzplanService;

  const USER = 'u1';
  const FREMD = 'u2';

  beforeEach(() => {
    klassenService = new KlassenService(new InMemoryKlassenRepository());
    raumService = new RaumService(new InMemoryRaumRepository());
    sitzplanRepository = new InMemorySitzplanRepository();
    sitzplanService = new SitzplanService(
      sitzplanRepository,
      klassenService,
      raumService,
      new SchuelerService(new InMemorySchuelerRepository(), klassenService),
    );
  });

  async function quellen(userId = USER) {
    const klasse = await klassenService.create(userId, { name: 'Fantasieklasse 7b' });
    const raum = await raumService.create(userId, {
      name: 'Fantasieraum',
      breiteCm: 800,
      laengeCm: 600,
      rasterCm: 50,
    });
    // Ein Doppeltisch → 1 Objekt, 2 adressierbare Sitzplätze
    await raumService.addObjekt(userId, raum.id, { typ: 'table_double' });
    return { klasse, raum };
  }

  async function plan(userId = USER, name = 'Fantasieplan') {
    const { klasse, raum } = await quellen(userId);
    const sitzplan = await sitzplanService.create(userId, { name, klasseId: klasse.id, raumId: raum.id });
    return { klasse, raum, sitzplan };
  }

  describe('create', () => {
    it('friert die validierte Raumgeometrie samt Sitzplatz-IDs im SitzplanDokumentV1 ein', async () => {
      const { klasse, raum, sitzplan } = await plan();

      expect(sitzplan.revision).toBe(1);
      expect(sitzplan.dokumentVersion).toBe(AKTUELLE_SITZPLAN_DOKUMENT_VERSION);
      expect(sitzplan.userId).toBe(USER);
      expect(sitzplan.klasseId).toBe(klasse.id);
      expect(sitzplan.raumId).toBe(raum.id);
      expect(sitzplan.id.startsWith('plan_')).toBe(true);
      expect(sitzplan.deletedAt).toBeNull();

      const dok = sitzplan.canvasDocument;
      expect(dok.version).toBe(1);
      expect(dok.quelle).toEqual({ klasseId: klasse.id, raumId: raum.id });
      expect(dok.zuordnungen).toEqual([]);
      expect(dok.raumGeometrie.breiteCm).toBe(800);
      expect(dok.raumGeometrie.laengeCm).toBe(600);
      expect(dok.raumGeometrie.rasterCm).toBe(50);
      expect(dok.raumGeometrie.objekte).toHaveLength(1);
      expect(dok.raumGeometrie.sitzplaetze).toHaveLength(2);

      // Stabile Sitzplatz-IDs der Vorlage werden übernommen, nicht neu erfunden
      const vorlage = migriereRaumDokument((await raumService.getById(USER, raum.id)).canvasDocument);
      expect(dok.raumGeometrie.sitzplaetze.map((s) => s.id)).toEqual(vorlage.sitzplaetze.map((s) => s.id));

      // Das persistierte Dokument validiert gegen den veröffentlichten Vertrag
      expect(SitzplanDokumentV1Schema.safeParse(dok).success).toBe(true);
    });

    it('persistiert ausschließlich Vertragsschlüssel ohne Konva-Artefakte', async () => {
      const { sitzplan } = await plan();
      const roh = JSON.stringify(sitzplan.canvasDocument);

      expect(Object.keys(sitzplan.canvasDocument).sort()).toEqual(['quelle', 'raumGeometrie', 'version', 'zuordnungen']);
      expect(roh).not.toContain('Konva');
      expect(roh).not.toContain('attrs');
      expect(roh).not.toContain('className');
      expect(JSON.parse(roh)).toEqual(sitzplan.canvasDocument);
    });

    it('lehnt ungültige Eingaben mit VALIDATION_ERROR ab', async () => {
      const { klasse, raum } = await quellen();

      for (const input of [
        { name: '', klasseId: klasse.id, raumId: raum.id },
        { name: 'x'.repeat(101), klasseId: klasse.id, raumId: raum.id },
        { name: 'Plan', klasseId: '', raumId: raum.id },
        { name: 'Plan', klasseId: klasse.id },
      ]) {
        const err = await sitzplanService.create(USER, input).catch((e) => e);
        expect(err).toBeInstanceOf(SitzplanError);
        expect(err.code).toBe('VALIDATION_ERROR');
      }
    });

    it('trimmt den Namen', async () => {
      const { klasse, raum } = await quellen();
      const sitzplan = await sitzplanService.create(USER, {
        name: '  Fantasieplan  ',
        klasseId: klasse.id,
        raumId: raum.id,
      });
      expect(sitzplan.name).toBe('Fantasieplan');
    });

    it('verlangt eine existierende Klasse (NOT_FOUND)', async () => {
      const { raum } = await quellen();
      const err = await sitzplanService
        .create(USER, { name: 'Plan', klasseId: 'kls_gibt_es_nicht', raumId: raum.id })
        .catch((e) => e);
      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toContain('Klasse');
    });

    it('verlangt eine eigene Klasse (FORBIDDEN)', async () => {
      const { raum } = await quellen();
      const fremdeKlasse = await klassenService.create(FREMD, { name: 'Fremde Klasse' });
      const err = await sitzplanService
        .create(USER, { name: 'Plan', klasseId: fremdeKlasse.id, raumId: raum.id })
        .catch((e) => e);
      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toContain('Klasse');
    });

    it('verlangt eine nicht soft-gelöschte Klasse (NOT_FOUND)', async () => {
      const { klasse, raum } = await quellen();
      await klassenService.delete(USER, klasse.id);
      const err = await sitzplanService
        .create(USER, { name: 'Plan', klasseId: klasse.id, raumId: raum.id })
        .catch((e) => e);
      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('NOT_FOUND');
    });

    it('verlangt eine existierende Raumvorlage (NOT_FOUND)', async () => {
      const { klasse } = await quellen();
      const err = await sitzplanService
        .create(USER, { name: 'Plan', klasseId: klasse.id, raumId: 'raum_gibt_es_nicht' })
        .catch((e) => e);
      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toContain('Raumvorlage');
    });

    it('verlangt eine eigene Raumvorlage (FORBIDDEN)', async () => {
      const { klasse } = await quellen();
      const fremderRaum = await raumService.create(FREMD, {
        name: 'Fremder Raum',
        breiteCm: 600,
        laengeCm: 400,
        rasterCm: 50,
      });
      const err = await sitzplanService
        .create(USER, { name: 'Plan', klasseId: klasse.id, raumId: fremderRaum.id })
        .catch((e) => e);
      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toContain('Raumvorlage');
    });

    it('verlangt eine nicht soft-gelöschte Raumvorlage (NOT_FOUND)', async () => {
      const { klasse, raum } = await quellen();
      await raumService.delete(USER, raum.id);
      const err = await sitzplanService
        .create(USER, { name: 'Plan', klasseId: klasse.id, raumId: raum.id })
        .catch((e) => e);
      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('NOT_FOUND');
    });
  });

  describe('Snapshot-Isolation', () => {
    it('lässt spätere Änderungen der Raumvorlage den bestehenden Plan unberührt', async () => {
      const { raum, sitzplan } = await plan();
      const eingefroren = structuredClone(sitzplan.canvasDocument);

      // Vorlage nachträglich verändern: Objekt ergänzen, Objekt bewegen, Raster ändern
      await raumService.addObjekt(USER, raum.id, { typ: 'board' });
      const tisch = migriereRaumDokument((await raumService.getById(USER, raum.id)).canvasDocument).objekte.find(
        (o) => o.typ === 'table_double',
      )!;
      await raumService.bewegeObjekt(USER, raum.id, tisch.id, { x_cm: 350, y_cm: 400 });
      await raumService.update(USER, raum.id, { rasterCm: 25, name: 'Umbenannter Raum' });

      const vorlage = migriereRaumDokument((await raumService.getById(USER, raum.id)).canvasDocument);
      expect(vorlage.objekte).toHaveLength(2);
      expect(vorlage.rasterCm).toBe(25);

      const erneutGeladen = await sitzplanService.getById(USER, sitzplan.id);
      expect(erneutGeladen.canvasDocument).toEqual(eingefroren);
      expect(erneutGeladen.canvasDocument.raumGeometrie.objekte).toHaveLength(1);
      expect(erneutGeladen.canvasDocument.raumGeometrie.rasterCm).toBe(50);
    });

    it('überlebt das Soft-Löschen der Quellklasse und der Quellvorlage', async () => {
      const { klasse, raum, sitzplan } = await plan();
      const eingefroren = structuredClone(sitzplan.canvasDocument);

      await klassenService.delete(USER, klasse.id);
      await raumService.delete(USER, raum.id);

      const erneutGeladen = await sitzplanService.getById(USER, sitzplan.id);
      expect(erneutGeladen.canvasDocument).toEqual(eingefroren);
    });
  });

  describe('list und getById', () => {
    it('liefert nur eigene, nicht gelöschte Pläne', async () => {
      const { sitzplan } = await plan(USER, 'Eigener Plan');
      await plan(FREMD, 'Fremder Plan');
      const geloescht = (await plan(USER, 'Gelöschter Plan')).sitzplan;
      await sitzplanService.delete(USER, geloescht.id);

      const liste = await sitzplanService.list(USER);
      expect(liste).toHaveLength(1);
      expect(liste[0].id).toBe(sitzplan.id);
    });

    it('meldet NOT_FOUND für unbekannte und soft-gelöschte Pläne', async () => {
      const { sitzplan } = await plan();

      const unbekannt = await sitzplanService.getById(USER, 'plan_unbekannt').catch((e) => e);
      expect(unbekannt).toBeInstanceOf(SitzplanError);
      expect(unbekannt.code).toBe('NOT_FOUND');

      await sitzplanService.delete(USER, sitzplan.id);
      const geloescht = await sitzplanService.getById(USER, sitzplan.id).catch((e) => e);
      expect(geloescht).toBeInstanceOf(SitzplanError);
      expect(geloescht.code).toBe('NOT_FOUND');
    });

    it('meldet FORBIDDEN für fremde Pläne', async () => {
      const { sitzplan } = await plan(FREMD);
      const err = await sitzplanService.getById(USER, sitzplan.id).catch((e) => e);
      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('FORBIDDEN');
    });
  });

  describe('update', () => {
    it('benennt um, ohne die Revision oder das Dokument zu verändern', async () => {
      const { sitzplan } = await plan();
      const vorher = structuredClone(sitzplan.canvasDocument);

      const umbenannt = await sitzplanService.update(USER, sitzplan.id, { name: '  Neuer Name  ' });
      expect(umbenannt.name).toBe('Neuer Name');
      expect(umbenannt.revision).toBe(1);
      expect(umbenannt.canvasDocument).toEqual(vorher);
      expect(umbenannt.klasseId).toBe(sitzplan.klasseId);
      expect(umbenannt.raumId).toBe(sitzplan.raumId);
    });

    it('lehnt ungültige Namen mit VALIDATION_ERROR ab', async () => {
      const { sitzplan } = await plan();
      for (const input of [{ name: '' }, { name: 'x'.repeat(101) }, {}]) {
        const err = await sitzplanService.update(USER, sitzplan.id, input).catch((e) => e);
        expect(err).toBeInstanceOf(SitzplanError);
        expect(err.code).toBe('VALIDATION_ERROR');
      }
    });

    it('ignoriert Versuche, Quelle, Dokument oder Revision über PATCH zu ändern', async () => {
      const { sitzplan } = await plan();
      const vorher = structuredClone(sitzplan.canvasDocument);

      const aktualisiert = await sitzplanService.update(USER, sitzplan.id, {
        name: 'Nur Name',
        klasseId: 'kls_uebernahme',
        raumId: 'raum_uebernahme',
        revision: 99,
        canvasDocument: { version: 1 },
      });

      expect(aktualisiert.name).toBe('Nur Name');
      expect(aktualisiert.klasseId).toBe(sitzplan.klasseId);
      expect(aktualisiert.raumId).toBe(sitzplan.raumId);
      expect(aktualisiert.revision).toBe(1);
      expect(aktualisiert.canvasDocument).toEqual(vorher);
    });

    it('wehrt fremde Umbenennungen ab', async () => {
      const { sitzplan } = await plan(FREMD);
      const err = await sitzplanService.update(USER, sitzplan.id, { name: 'Übernommen' }).catch((e) => e);
      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('FORBIDDEN');
    });
  });

  describe('delete', () => {
    it('entfernt den Plan aus der Liste, ohne Dokument oder Metadaten zu verlieren', async () => {
      const { sitzplan } = await plan();
      const eingefroren = structuredClone(sitzplan.canvasDocument);

      await sitzplanService.delete(USER, sitzplan.id);
      expect(await sitzplanService.list(USER)).toHaveLength(0);

      // Soft-Delete: Der Datensatz bleibt vollständig erhalten.
      const roh = await sitzplanRepository.findById(sitzplan.id);
      expect(roh).not.toBeNull();
      expect(roh!.deletedAt).not.toBeNull();
      expect(roh!.name).toBe(sitzplan.name);
      expect(roh!.klasseId).toBe(sitzplan.klasseId);
      expect(roh!.raumId).toBe(sitzplan.raumId);
      expect(roh!.canvasDocument).toEqual(eingefroren);
    });

    it('wehrt fremdes Löschen ab und meldet unbekannte Pläne als NOT_FOUND', async () => {
      const { sitzplan } = await plan(FREMD);

      const fremd = await sitzplanService.delete(USER, sitzplan.id).catch((e) => e);
      expect(fremd).toBeInstanceOf(SitzplanError);
      expect(fremd.code).toBe('FORBIDDEN');

      const unbekannt = await sitzplanService.delete(USER, 'plan_unbekannt').catch((e) => e);
      expect(unbekannt).toBeInstanceOf(SitzplanError);
      expect(unbekannt.code).toBe('NOT_FOUND');
    });
  });
});
