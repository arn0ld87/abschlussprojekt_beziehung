import { describe, it, expect, beforeEach } from 'vitest';
import { KlassenService } from '../../src/domain/klasse';
import { RaumService } from '../../src/domain/raum';
import { SchuelerService } from '../../src/domain/schueler';
import { SitzplanService, SitzplanError } from '../../src/domain/sitzplan';
import { InMemoryKlassenRepository } from '../../src/infrastructure/db/in-memory-klassen-repository';
import { InMemoryRaumRepository } from '../../src/infrastructure/db/in-memory-raum-repository';
import { InMemorySchuelerRepository } from '../../src/infrastructure/db/in-memory-schueler-repository';
import { InMemorySitzplanRepository } from '../../src/infrastructure/db/in-memory-sitzplan-repository';

// Schreibpfad und Ladeansicht der Schülerzuordnung (M3 #57). Berechtigung,
// Klassenzugehörigkeit und Soft-Delete werden serverseitig erzwungen — die
// Bedienoberfläche ist kein Schutzmechanismus.
describe('SitzplanService — Zuordnungen (M3 #57)', () => {
  let klassenService: KlassenService;
  let raumService: RaumService;
  let schuelerService: SchuelerService;
  let schuelerRepository: InMemorySchuelerRepository;
  let sitzplanService: SitzplanService;

  const USER = 'u1';
  const FREMD = 'u2';

  beforeEach(() => {
    klassenService = new KlassenService(new InMemoryKlassenRepository());
    raumService = new RaumService(new InMemoryRaumRepository());
    schuelerRepository = new InMemorySchuelerRepository();
    schuelerService = new SchuelerService(schuelerRepository, klassenService);
    sitzplanService = new SitzplanService(
      new InMemorySitzplanRepository(),
      klassenService,
      raumService,
      schuelerService,
    );
  });

  async function szenario(userId = USER) {
    const klasse = await klassenService.create(userId, { name: 'Fantasieklasse 7b' });
    const raum = await raumService.create(userId, {
      name: 'Fantasieraum',
      breiteCm: 800,
      laengeCm: 600,
      rasterCm: 50,
    });
    // Ein Doppeltisch → zwei adressierbare Sitzplätze
    await raumService.addObjekt(userId, raum.id, { typ: 'table_double' });

    const sitzplan = await sitzplanService.create(userId, {
      name: 'Fantasieplan',
      klasseId: klasse.id,
      raumId: raum.id,
    });

    const anna = await schuelerService.create(userId, klasse.id, { name: 'Anna Fantasie' });
    const bruno = await schuelerService.create(userId, klasse.id, { name: 'Bruno Fantasie' });

    const [platzA, platzB] = sitzplan.canvasDocument.raumGeometrie.sitzplaetze.map((s) => s.id);
    return { klasse, raum, sitzplan, anna, bruno, platzA, platzB };
  }

  describe('setzeZuordnungen', () => {
    it('schreibt das vollständige validierte Dokument und hält die Geometrie eingefroren', async () => {
      const { sitzplan, anna, platzA } = await szenario();
      const geometrieVorher = structuredClone(sitzplan.canvasDocument.raumGeometrie);

      const aktualisiert = await sitzplanService.setzeZuordnungen(USER, sitzplan.id, {
        zuordnungen: [{ sitzplatzId: platzA, schuelerId: anna.id }],
      });

      expect(aktualisiert.canvasDocument.zuordnungen).toEqual([{ sitzplatzId: platzA, schuelerId: anna.id }]);
      expect(aktualisiert.canvasDocument.raumGeometrie).toEqual(geometrieVorher);
      expect(aktualisiert.canvasDocument.quelle).toEqual(sitzplan.canvasDocument.quelle);
      expect(aktualisiert.canvasDocument.version).toBe(1);
      // Revision zählt den Serverstand und wird erst vom Autosave-Slice
      // (M3 #59, ADR-0004) fortgeschrieben.
      expect(aktualisiert.revision).toBe(1);
    });

    it('bleibt nach erneutem Laden erhalten', async () => {
      const { sitzplan, anna, bruno, platzA, platzB } = await szenario();

      await sitzplanService.setzeZuordnungen(USER, sitzplan.id, {
        zuordnungen: [
          { sitzplatzId: platzB, schuelerId: bruno.id },
          { sitzplatzId: platzA, schuelerId: anna.id },
        ],
      });

      const geladen = await sitzplanService.getById(USER, sitzplan.id);
      // Deterministische Reihenfolge, unabhängig von der Sendereihenfolge
      expect(geladen.canvasDocument.zuordnungen).toEqual([
        { sitzplatzId: platzA, schuelerId: anna.id },
        { sitzplatzId: platzB, schuelerId: bruno.id },
      ]);
    });

    it('erlaubt das Leeren der Zuordnung', async () => {
      const { sitzplan, anna, platzA } = await szenario();
      await sitzplanService.setzeZuordnungen(USER, sitzplan.id, {
        zuordnungen: [{ sitzplatzId: platzA, schuelerId: anna.id }],
      });

      const geleert = await sitzplanService.setzeZuordnungen(USER, sitzplan.id, { zuordnungen: [] });
      expect(geleert.canvasDocument.zuordnungen).toEqual([]);
    });

    it('lehnt unbekannte Sitzplatz-IDs ab', async () => {
      const { sitzplan, anna } = await szenario();
      const err = await sitzplanService
        .setzeZuordnungen(USER, sitzplan.id, {
          zuordnungen: [{ sitzplatzId: 'obj_fremd__sitz_1', schuelerId: anna.id }],
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.message).toMatch(/Sitzplatz/);
    });

    it('lehnt eine Doppelbelegung desselben Sitzplatzes ab', async () => {
      const { sitzplan, anna, bruno, platzA } = await szenario();
      const err = await sitzplanService
        .setzeZuordnungen(USER, sitzplan.id, {
          zuordnungen: [
            { sitzplatzId: platzA, schuelerId: anna.id },
            { sitzplatzId: platzA, schuelerId: bruno.id },
          ],
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('VALIDATION_ERROR');
    });

    it('lehnt denselben Schüler auf zwei Sitzplätzen ab', async () => {
      const { sitzplan, anna, platzA, platzB } = await szenario();
      const err = await sitzplanService
        .setzeZuordnungen(USER, sitzplan.id, {
          zuordnungen: [
            { sitzplatzId: platzA, schuelerId: anna.id },
            { sitzplatzId: platzB, schuelerId: anna.id },
          ],
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('VALIDATION_ERROR');
    });

    it('lehnt Schüler aus einer fremden Klasse ab', async () => {
      const { sitzplan, platzA } = await szenario();
      const andereKlasse = await klassenService.create(USER, { name: 'Fantasieklasse 9c' });
      const fremderSchueler = await schuelerService.create(USER, andereKlasse.id, { name: 'Clara Fantasie' });

      const err = await sitzplanService
        .setzeZuordnungen(USER, sitzplan.id, {
          zuordnungen: [{ sitzplatzId: platzA, schuelerId: fremderSchueler.id }],
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.message).toMatch(/Klasse/);
    });

    it('lehnt Schüler eines fremden Benutzers ab', async () => {
      const { sitzplan, platzA } = await szenario();
      const fremdeKlasse = await klassenService.create(FREMD, { name: 'Fremde Klasse' });
      const fremderSchueler = await schuelerService.create(FREMD, fremdeKlasse.id, { name: 'Dora Fantasie' });

      const err = await sitzplanService
        .setzeZuordnungen(USER, sitzplan.id, {
          zuordnungen: [{ sitzplatzId: platzA, schuelerId: fremderSchueler.id }],
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('VALIDATION_ERROR');
    });

    it('lehnt soft-gelöschte Schüler ab', async () => {
      const { klasse, sitzplan, anna, platzA } = await szenario();
      await schuelerService.delete(USER, klasse.id, anna.id);

      const err = await sitzplanService
        .setzeZuordnungen(USER, sitzplan.id, {
          zuordnungen: [{ sitzplatzId: platzA, schuelerId: anna.id }],
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('VALIDATION_ERROR');
    });

    it('erlaubt das Aufräumen eines Altbestands mit mehreren veralteten Zuordnungen', async () => {
      const { klasse, sitzplan, anna, bruno, platzA, platzB } = await szenario();
      await sitzplanService.setzeZuordnungen(USER, sitzplan.id, {
        zuordnungen: [
          { sitzplatzId: platzA, schuelerId: anna.id },
          { sitzplatzId: platzB, schuelerId: bruno.id },
        ],
      });

      await schuelerService.delete(USER, klasse.id, anna.id);
      await schuelerService.delete(USER, klasse.id, bruno.id);

      // Erst der eine veraltete Eintrag — der zweite bleibt zunächst stehen
      // und darf den Speichervorgang nicht blockieren.
      const nachErstemAufraeumen = await sitzplanService.setzeZuordnungen(USER, sitzplan.id, {
        zuordnungen: [{ sitzplatzId: platzB, schuelerId: bruno.id }],
      });
      expect(nachErstemAufraeumen.canvasDocument.zuordnungen).toEqual([
        { sitzplatzId: platzB, schuelerId: bruno.id },
      ]);

      const leer = await sitzplanService.setzeZuordnungen(USER, sitzplan.id, { zuordnungen: [] });
      expect(leer.canvasDocument.zuordnungen).toEqual([]);

      // Danach ist der gelöschte Schüler endgültig nicht mehr zuordenbar.
      const err = await sitzplanService
        .setzeZuordnungen(USER, sitzplan.id, { zuordnungen: [{ sitzplatzId: platzA, schuelerId: anna.id }] })
        .catch((e) => e);
      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('VALIDATION_ERROR');
    });

    it('lehnt ungültige Eingabeformen mit VALIDATION_ERROR ab', async () => {
      const { sitzplan, platzA } = await szenario();
      for (const input of [
        {},
        { zuordnungen: 'keine Liste' },
        { zuordnungen: [{ sitzplatzId: platzA }] },
        { zuordnungen: [{ sitzplatzId: '', schuelerId: 'x' }] },
      ]) {
        const err = await sitzplanService.setzeZuordnungen(USER, sitzplan.id, input).catch((e) => e);
        expect(err).toBeInstanceOf(SitzplanError);
        expect(err.code).toBe('VALIDATION_ERROR');
      }
    });

    it('wehrt fremde und unbekannte Pläne ab', async () => {
      const fremd = await szenario(FREMD);
      const fremdFehler = await sitzplanService
        .setzeZuordnungen(USER, fremd.sitzplan.id, { zuordnungen: [] })
        .catch((e) => e);
      expect(fremdFehler).toBeInstanceOf(SitzplanError);
      expect(fremdFehler.code).toBe('FORBIDDEN');

      const unbekannt = await sitzplanService
        .setzeZuordnungen(USER, 'plan_unbekannt', { zuordnungen: [] })
        .catch((e) => e);
      expect(unbekannt).toBeInstanceOf(SitzplanError);
      expect(unbekannt.code).toBe('NOT_FOUND');
    });
  });

  describe('ansicht', () => {
    it('zeigt jeden aktiven Schüler genau einmal: in der Ablage oder auf genau einem Platz', async () => {
      const { sitzplan, anna, bruno, platzA } = await szenario();
      await sitzplanService.setzeZuordnungen(USER, sitzplan.id, {
        zuordnungen: [{ sitzplatzId: platzA, schuelerId: anna.id }],
      });

      const ansicht = await sitzplanService.ansicht(USER, sitzplan.id);

      expect(ansicht.ablage.map((s) => s.id)).toEqual([bruno.id]);
      expect(ansicht.belegung).toHaveLength(1);
      expect(ansicht.belegung[0].sitzplatzId).toBe(platzA);
      expect(ansicht.belegung[0].schueler.id).toBe(anna.id);
      expect(ansicht.befunde).toEqual([]);

      const alle = [...ansicht.ablage.map((s) => s.id), ...ansicht.belegung.map((b) => b.schueler.id)].sort();
      expect(alle).toEqual([anna.id, bruno.id].sort());
    });

    it('bietet soft-gelöschte Schüler nicht mehr an und meldet sie als Befund, ohne das Laden zu verhindern', async () => {
      const { klasse, sitzplan, anna, bruno, platzA } = await szenario();
      await sitzplanService.setzeZuordnungen(USER, sitzplan.id, {
        zuordnungen: [{ sitzplatzId: platzA, schuelerId: anna.id }],
      });

      await schuelerService.delete(USER, klasse.id, anna.id);

      const ansicht = await sitzplanService.ansicht(USER, sitzplan.id);

      // Der Plan lädt weiterhin, und die Zuordnung bleibt persistiert.
      expect(ansicht.sitzplan.canvasDocument.zuordnungen).toEqual([{ sitzplatzId: platzA, schuelerId: anna.id }]);
      // Der gelöschte Schüler wird nicht neu angeboten.
      expect(ansicht.ablage.map((s) => s.id)).toEqual([bruno.id]);
      expect(ansicht.belegung).toEqual([]);
      // Und er erzeugt einen verständlichen Inkonsistenzbefund.
      expect(ansicht.befunde).toHaveLength(1);
      expect(ansicht.befunde[0].code).toBe('SCHUELER_NICHT_AKTIV');
      expect(ansicht.befunde[0].schuelerId).toBe(anna.id);
      expect(ansicht.befunde[0].meldung).toMatch(/nicht mehr aktiv/i);
    });

    it('lädt den Plan auch nach dem Soft-Löschen der Quellklasse', async () => {
      const { klasse, sitzplan, anna, platzA } = await szenario();
      await sitzplanService.setzeZuordnungen(USER, sitzplan.id, {
        zuordnungen: [{ sitzplatzId: platzA, schuelerId: anna.id }],
      });

      await klassenService.delete(USER, klasse.id);

      const ansicht = await sitzplanService.ansicht(USER, sitzplan.id);
      expect(ansicht.sitzplan.id).toBe(sitzplan.id);
      expect(ansicht.ablage).toEqual([]);
      expect(ansicht.befunde).toHaveLength(1);
    });

    it('wehrt fremde Pläne ab', async () => {
      const fremd = await szenario(FREMD);
      const err = await sitzplanService.ansicht(USER, fremd.sitzplan.id).catch((e) => e);
      expect(err).toBeInstanceOf(SitzplanError);
      expect(err.code).toBe('FORBIDDEN');
    });
  });
});
