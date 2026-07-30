import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RaumService, RaumError } from '../../src/domain/raum';
import { InMemoryRaumRepository } from '../../src/infrastructure/db/in-memory-raum-repository';

describe('RaumService', () => {
  let repo: InMemoryRaumRepository;
  let service: RaumService;

  beforeEach(() => {
    repo = new InMemoryRaumRepository();
    service = new RaumService(repo);
  });

  const gueltig = { name: 'Klassenraum A', breiteCm: 800, laengeCm: 600, rasterCm: 50 };

  it('creates a raum with versioned RaumDokumentV1', async () => {
    const r = await service.create('u1', gueltig);
    expect(r.id).toMatch(/^raum_/);
    expect(r.name).toBe('Klassenraum A');
    expect(r.userId).toBe('u1');
    expect(r.dokumentVersion).toBe(2);
    expect(r.canvasDocument.version).toBe(2);
    expect(r.canvasDocument.breiteCm).toBe(800);
    expect(r.canvasDocument.laengeCm).toBe(600);
    expect(r.canvasDocument.rasterCm).toBe(50);
    expect(r.canvasDocument.objekte).toEqual([]);
  });

  it('canvas document contains no Konva- or React-specific keys', async () => {
    const r = await service.create('u1', gueltig);
    const keys = Object.keys(r.canvasDocument);
    expect(keys.sort()).toEqual(['breiteCm', 'laengeCm', 'objekte', 'rasterCm', 'version']);
    // JSON-Roundtrip ohne Verlust — keine Klasseninstanzen (Konva-Nodes) im Dokument
    expect(JSON.parse(JSON.stringify(r.canvasDocument))).toEqual(r.canvasDocument);
  });

  it('fails creation with empty name', async () => {
    await expect(service.create('u1', { ...gueltig, name: '' })).rejects.toThrow(RaumError);
  });

  it('fails creation with non-positive maße', async () => {
    await expect(service.create('u1', { ...gueltig, breiteCm: 0 })).rejects.toThrow(RaumError);
    await expect(service.create('u1', { ...gueltig, laengeCm: -5 })).rejects.toThrow(RaumError);
    await expect(service.create('u1', { ...gueltig, rasterCm: 0 })).rejects.toThrow(RaumError);
  });

  it('lehnt ein Raster unter 1 cm ab (Regression: Rasterdichte-Begrenzung)', async () => {
    const err = await service.create('u1', { ...gueltig, rasterCm: 0.5 }).catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('fails creation when raster exceeds the smaller side', async () => {
    await expect(service.create('u1', { ...gueltig, rasterCm: 601 })).rejects.toThrow(RaumError);
    await expect(service.create('u1', { ...gueltig, rasterCm: 600 })).resolves.toBeDefined();
  });

  it('lists only own, non-deleted raeume', async () => {
    await service.create('u1', gueltig);
    await service.create('u1', { ...gueltig, name: 'R2' });
    await service.create('u2', { ...gueltig, name: 'Fremd' });

    const list = await service.list('u1');
    expect(list).toHaveLength(2);
  });

  it('gets by id successfully', async () => {
    const r = await service.create('u1', gueltig);
    const fetched = await service.getById('u1', r.id);
    expect(fetched.id).toBe(r.id);
  });

  it('fails getById for other user (FORBIDDEN)', async () => {
    const r = await service.create('u1', gueltig);
    const err = await service.getById('u2', r.id).catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('fails getById for missing raum (NOT_FOUND)', async () => {
    const err = await service.getById('u1', 'missing').catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('updates name only without touching the canvas document', async () => {
    const r = await service.create('u1', gueltig);
    const updated = await service.update('u1', r.id, { name: 'Neuer Name' });
    expect(updated.name).toBe('Neuer Name');
    expect(updated.canvasDocument).toEqual(r.canvasDocument);
  });

  it('updates maße and revalidates the canvas document', async () => {
    const r = await service.create('u1', gueltig);
    const updated = await service.update('u1', r.id, { rasterCm: 25 });
    expect(updated.rasterCm).toBe(25);
    expect(updated.canvasDocument.rasterCm).toBe(25);
    expect(updated.canvasDocument.version).toBe(2);
  });

  it('rejects update when merged raster exceeds the smaller side', async () => {
    const r = await service.create('u1', gueltig);
    await expect(service.update('u1', r.id, { laengeCm: 40 })).rejects.toThrow(RaumError);
    const err = await service.update('u1', r.id, { rasterCm: 900 }).catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('rejects empty update input', async () => {
    const r = await service.create('u1', gueltig);
    await expect(service.update('u1', r.id, {})).rejects.toThrow(RaumError);
  });

  it('updates maße atomically: all merged dimensions written together with the document', async () => {
    const r = await service.create('u1', gueltig);
    const updateSpy = vi.spyOn(repo, 'update');

    await service.update('u1', r.id, { rasterCm: 25 });

    expect(updateSpy).toHaveBeenCalledOnce();
    const [, data] = updateSpy.mock.calls[0];
    expect(data.breiteCm).toBe(800);
    expect(data.laengeCm).toBe(600);
    expect(data.rasterCm).toBe(25);
    expect(data.canvasDocument).toMatchObject({ version: 2, breiteCm: 800, laengeCm: 600, rasterCm: 25 });
    updateSpy.mockRestore();
  });

  it('rejects metadata-only update when the persisted document is malformed', async () => {
    const r = await service.create('u1', gueltig);
    // Simuliert einen beschädigten/veralteten JSONB-Stand direkt im Repository
    await repo.update(r.id, { canvasDocument: { version: 99 } as never, updatedAt: new Date() });

    const err = await service.update('u1', r.id, { name: 'Neuer Name' }).catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toContain('Persistiertes Raumdokument');
  });

  it('rejects update for other user', async () => {
    const r = await service.create('u1', gueltig);
    await expect(service.update('u2', r.id, { name: 'X' })).rejects.toThrow(RaumError);
  });

  it('soft deletes and hides raum from list and getById', async () => {
    const r = await service.create('u1', gueltig);
    await service.delete('u1', r.id);

    expect(await service.list('u1')).toHaveLength(0);
    const err = await service.getById('u1', r.id).catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('rejects delete for other user', async () => {
    const r = await service.create('u1', gueltig);
    await expect(service.delete('u2', r.id)).rejects.toThrow(RaumError);
  });

  // --- M2 #51: Standardobjekte ---

  it('fügt jede Objektart mit Standardmaßen, UUID-ID und gültiger Startposition hinzu', async () => {
    const r = await service.create('u1', gueltig);
    let stand = r;
    for (const typ of ['table_single', 'table_double', 'teacher_desk', 'board', 'door', 'window'] as const) {
      stand = await service.addObjekt('u1', r.id, { typ });
    }
    const objekte = stand.canvasDocument.objekte;
    expect(objekte).toHaveLength(6);
    expect(new Set(objekte.map((o) => o.id)).size).toBe(6);
    for (const o of objekte) {
      expect(o.id).toMatch(/^obj_/);
      expect(o.x_cm).toBeGreaterThanOrEqual(0);
      expect(o.y_cm).toBeGreaterThanOrEqual(0);
      expect(o.x_cm + o.breite_cm).toBeLessThanOrEqual(800);
      expect(o.y_cm + o.tiefe_cm).toBeLessThanOrEqual(600);
    }
  });

  it('rekonstruiert alle sechs Objektarten nach Reload typ-, positions- und maßgleich', async () => {
    const r = await service.create('u1', gueltig);
    for (const typ of ['table_single', 'table_double', 'teacher_desk', 'board', 'door', 'window'] as const) {
      await service.addObjekt('u1', r.id, { typ });
    }
    const vorher = (await service.getById('u1', r.id)).canvasDocument.objekte;
    // Reload-Simulation: frische Service-Instanz auf demselben Repository
    const reload = await new RaumService(repo).getById('u1', r.id);
    expect(reload.canvasDocument.objekte).toEqual(vorher);
    expect(reload.canvasDocument.objekte.map((o) => o.typ).sort()).toEqual(
      ['board', 'door', 'table_double', 'table_single', 'teacher_desk', 'window'].sort(),
    );
  });

  it('lehnt unbekannte Objektarten mit stabilem Fehlercode ab', async () => {
    const r = await service.create('u1', gueltig);
    const err = await service.addObjekt('u1', r.id, { typ: 'spaceship' }).catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('rejects addObjekt for other user and missing raum', async () => {
    const r = await service.create('u1', gueltig);
    const errForbidden = await service.addObjekt('u2', r.id, { typ: 'board' }).catch((e) => e);
    expect(errForbidden.code).toBe('FORBIDDEN');
    const errMissing = await service.addObjekt('u1', 'missing', { typ: 'board' }).catch((e) => e);
    expect(errMissing.code).toBe('NOT_FOUND');
  });

  it('behält Objekte bei Maßänderungen im Dokument', async () => {
    const r = await service.create('u1', gueltig);
    await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const updated = await service.update('u1', r.id, { rasterCm: 25 });
    expect(updated.canvasDocument.objekte).toHaveLength(1);
    expect(updated.canvasDocument.rasterCm).toBe(25);
  });

  it('lehnt Verkleinerungen ab, die Objekte aus dem Raum schieben würden', async () => {
    const r = await service.create('u1', gueltig);
    await service.addObjekt('u1', r.id, { typ: 'table_double' }); // startet in Raummitte
    const err = await service.update('u1', r.id, { breiteCm: 200, laengeCm: 200, rasterCm: 50 }).catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toContain('aus dem Raum');
  });

  it('lehnt Standardobjekte ab, die größer als der Raum sind (stabiler 422 statt 500)', async () => {
    const klein = await service.create('u1', { name: 'Kleinraum', breiteCm: 300, laengeCm: 200, rasterCm: 50 });
    const err = await service.addObjekt('u1', klein.id, { typ: 'board' }).catch((e) => e); // Tafel 400 cm breit
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toContain('passt');
  });

  it('migriert V1-Bestandsdokumente beim nächsten Schreibvorgang validiert nach V2', async () => {
    const r = await service.create('u1', gueltig);
    // Simuliert einen V1-Bestandsstand (Schemaversion 1, leere Objektliste)
    await repo.update(r.id, {
      dokumentVersion: 1,
      canvasDocument: { version: 1, breiteCm: 800, laengeCm: 600, rasterCm: 50, objekte: [] } as never,
      updatedAt: new Date(),
    });

    const updated = await service.addObjekt('u1', r.id, { typ: 'table_single' });
    expect(updated.canvasDocument.version).toBe(2);
    expect(updated.dokumentVersion).toBe(2);
    expect(updated.canvasDocument.objekte).toHaveLength(1);

    // Auch reine Metadaten-Updates lesen V1 ohne Fehler
    await repo.update(r.id, {
      dokumentVersion: 1,
      canvasDocument: { version: 1, breiteCm: 800, laengeCm: 600, rasterCm: 50, objekte: [] } as never,
      updatedAt: new Date(),
    });
    const renamed = await service.update('u1', r.id, { name: 'Umbenannt' });
    expect(renamed.name).toBe('Umbenannt');
  });

  // --- M2 #52: Objektinteraktion ---

  it('verschiebt ein Objekt mit serverseitigem Rasterfang und persistiert die Endposition', async () => {
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const objektId = mit.canvasDocument.objekte[0].id;

    const bewegt = await service.bewegeObjekt('u1', r.id, objektId, { x_cm: 137, y_cm: 249 });
    const o = bewegt.canvasDocument.objekte[0];
    expect(o.x_cm).toBe(150);
    expect(o.y_cm).toBe(250);
  });

  it('klemmt Bewegungen über die Raumgrenze hinaus auf eine gültige Position', async () => {
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const objektId = mit.canvasDocument.objekte[0].id;

    const bewegt = await service.bewegeObjekt('u1', r.id, objektId, { x_cm: 99999, y_cm: -500 });
    const o = bewegt.canvasDocument.objekte[0];
    expect(o.x_cm + o.breite_cm).toBeLessThanOrEqual(800);
    expect(o.y_cm).toBeGreaterThanOrEqual(0);
  });

  it('lehnt Bewegungen mit ungültiger Eingabe ab und behält den bestätigten Stand', async () => {
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const vorher = mit.canvasDocument.objekte[0];

    const err = await service
      .bewegeObjekt('u1', r.id, vorher.id, { x_cm: Number.NaN, y_cm: 0 })
      .catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('VALIDATION_ERROR');

    // Fehlerpfad: Repository enthält weiterhin den letzten bestätigten Stand
    const danach = await service.getById('u1', r.id);
    expect(danach.canvasDocument.objekte[0].x_cm).toBe(vorher.x_cm);
    expect(danach.canvasDocument.objekte[0].y_cm).toBe(vorher.y_cm);
  });

  it('meldet unbekannte Objekte mit NOT_FOUND und fremde Räume mit FORBIDDEN', async () => {
    const r = await service.create('u1', gueltig);
    const errMissing = await service.bewegeObjekt('u1', r.id, 'obj_unbekannt', { x_cm: 0, y_cm: 0 }).catch((e) => e);
    expect(errMissing.code).toBe('NOT_FOUND');

    const mit = await service.addObjekt('u1', r.id, { typ: 'board' });
    const errForbidden = await service
      .bewegeObjekt('u2', r.id, mit.canvasDocument.objekte[0].id, { x_cm: 0, y_cm: 0 })
      .catch((e) => e);
    expect(errForbidden.code).toBe('FORBIDDEN');
  });

  // --- M2 #53: Objektaktionen ---

  it('dreht ein Objekt in 90-Grad-Schritten und persistiert die Rotation', async () => {
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const id = mit.canvasDocument.objekte[0].id;

    const gedreht = await service.rotiereObjekt('u1', r.id, id);
    expect(gedreht.canvasDocument.objekte[0].rotation_deg).toBe(90);

    const viermalGedreht = await service.rotiereObjekt('u1', r.id, id)
      .then(() => service.rotiereObjekt('u1', r.id, id))
      .then(() => service.rotiereObjekt('u1', r.id, id));
    expect(viermalGedreht.canvasDocument.objekte[0].rotation_deg).toBe(0);
  });

  it('lehnt Rotationen ab, die das Objekt aus dem Raum schieben würden', async () => {
    const r = await service.create('u1', gueltig);
    // Fenster liegt flach an der linken Wand (15 × 180) — eine 90°-Drehung
    // um den Mittelpunkt ragt über die linke Raumgrenze hinaus.
    const mit = await service.addObjekt('u1', r.id, { typ: 'window' });
    const fenster = mit.canvasDocument.objekte[0];

    const err = await service.rotiereObjekt('u1', r.id, fenster.id).catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('VALIDATION_ERROR');

    // Bestätigter Stand bleibt unverändert
    const danach = await service.getById('u1', r.id);
    expect(danach.canvasDocument.objekte[0].rotation_deg).toBe(0);
  });

  it('dupliziert mit neuer UUID und rasterversetzter Position ohne Kollision', async () => {
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const original = mit.canvasDocument.objekte[0];

    const dupliziert = await service.dupliziereObjekt('u1', r.id, original.id);
    const objekte = dupliziert.canvasDocument.objekte;
    expect(objekte).toHaveLength(2);

    const kopie = objekte.find((o) => o.id !== original.id)!;
    expect(kopie.id).toMatch(/^obj_/);
    expect(kopie.id).not.toBe(original.id);
    expect(kopie.typ).toBe(original.typ);
    expect(kopie.breite_cm).toBe(original.breite_cm);
    expect(kopie.x_cm === original.x_cm && kopie.y_cm === original.y_cm).toBe(false);
    expect(kopie.x_cm % 50).toBeCloseTo(0, 6);
  });

  it('lehnt Duplikate ab, wenn kein freier Platz im Raum ist', async () => {
    const r = await service.create('u1', { name: 'Eng', breiteCm: 400, laengeCm: 600, rasterCm: 50 });
    // Tafel (400 breit) in 400-breitem Raum + raumfüllendes Objekt simulieren:
    // Direkt ein raumfüllendes Objekt in den Bestand schreiben.
    const mit = await service.addObjekt('u1', r.id, { typ: 'board' });
    const tafel = mit.canvasDocument.objekte[0];
    await repo.update(r.id, {
      canvasDocument: {
        ...mit.canvasDocument,
        objekte: [{ ...tafel, tiefe_cm: 600 }],
      } as never,
      updatedAt: new Date(),
    });

    const err = await service.dupliziereObjekt('u1', r.id, tafel.id).catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toContain('Kein freier Platz');
  });

  it('löscht genau das ausgewählte Objekt und keine anderen', async () => {
    const r = await service.create('u1', gueltig);
    await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_double' });
    const [erster, zweiter] = mit.canvasDocument.objekte;

    const geloescht = await service.entferneObjekt('u1', r.id, erster.id);
    expect(geloescht.canvasDocument.objekte).toHaveLength(1);
    expect(geloescht.canvasDocument.objekte[0].id).toBe(zweiter.id);

    const err = await service.entferneObjekt('u1', r.id, erster.id).catch((e) => e);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('Aktionsfolge bleibt nach Reload erhalten (drehen → duplizieren → verschieben → löschen)', async () => {
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const original = mit.canvasDocument.objekte[0];

    await service.rotiereObjekt('u1', r.id, original.id);
    const dupliziert = await service.dupliziereObjekt('u1', r.id, original.id);
    const kopie = dupliziert.canvasDocument.objekte.find((o) => o.id !== original.id)!;
    await service.bewegeObjekt('u1', r.id, kopie.id, { x_cm: 333, y_cm: 111 });
    await service.entferneObjekt('u1', r.id, original.id);

    // Reload-Simulation: frische Service-Instanz auf demselben Repository
    const reload = await new RaumService(repo).getById('u1', r.id);
    expect(reload.canvasDocument.objekte).toHaveLength(1);
    const uebrig = reload.canvasDocument.objekte[0];
    expect(uebrig.id).toBe(kopie.id);
    expect(uebrig.rotation_deg).toBe(90);
    expect(uebrig.x_cm).toBe(350);
    expect(uebrig.y_cm).toBe(100);
  });

  // --- Optimistische Nebenläufigkeitskontrolle (Compare-and-Swap, PR #80) ---

  it('CAS-Update gelingt mit aktuellem updatedAt und schlägt mit veraltetem fehl', async () => {
    const r = await service.create('u1', gueltig);

    const ok = await repo.update(r.id, { name: 'Neu', updatedAt: new Date() }, new Date(r.updatedAt));
    expect(ok).not.toBeNull();
    expect(ok!.name).toBe('Neu');

    // Veralteter Vergleichswert (Stand vor dem erfolgreichen Update) →
    // null statt stiller Überschreibung. Explizit älterer Zeitstempel,
    // damit der Test unabhängig von Millisekunden-Auflösung ist.
    const veraltet = new Date(new Date(ok!.updatedAt).getTime() - 1000);
    const stale = await repo.update(r.id, { name: 'Verloren', updatedAt: new Date() }, veraltet);
    expect(stale).toBeNull();

    const danach = await service.getById('u1', r.id);
    expect(danach.name).toBe('Neu');
  });

  it('Objektaktion meldet CONFLICT statt scheinbar erfolgreicher Mutation bei verlorenem CAS', async () => {
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const id = mit.canvasDocument.objekte[0].id;

    // Simuliert einen parallelen Write zwischen Lesen und Schreiben:
    // Das Repository lehnt den Compare-and-Swap ab.
    const origUpdate = repo.update.bind(repo);
    repo.update = (async (raumId: string, data: never, erwartet?: Date) =>
      erwartet ? null : origUpdate(raumId, data)) as typeof repo.update;

    const err = await service.rotiereObjekt('u1', r.id, id).catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toContain('zwischenzeitlich geändert');
  });
});
