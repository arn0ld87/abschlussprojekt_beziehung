import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, closeDb } from '../../src/infrastructure/db/client';
import { sitzplaene, users } from '../../src/infrastructure/db/schema';
import { DrizzleKlassenRepository } from '../../src/infrastructure/db/klassen-repository';
import { DrizzleRaumRepository } from '../../src/infrastructure/db/raum-repository';
import { DrizzleSitzplanRepository } from '../../src/infrastructure/db/sitzplan-repository';
import { KlassenService } from '../../src/domain/klasse';
import { RaumService } from '../../src/domain/raum';
import { SitzplanService, SitzplanError } from '../../src/domain/sitzplan';

// M3-56-Akzeptanzpfad gegen eine echte PostgreSQL-Instanz mit
// Test-/Fantasiedaten. Opt-in: ohne TEST_DATABASE_URL wird übersprungen
// (CI ohne Service-Container bleibt grün); lokal:
//   TEST_DATABASE_URL="$DATABASE_URL" bun run test
const TEST_DB = process.env.TEST_DATABASE_URL;
const lauf = describe.skipIf(!TEST_DB);

const USER_A = 'user_m3_56_a';
const USER_B = 'user_m3_56_b';

function dienste() {
  const klassenService = new KlassenService(new DrizzleKlassenRepository());
  const raumService = new RaumService(new DrizzleRaumRepository());
  const sitzplanService = new SitzplanService(new DrizzleSitzplanRepository(), klassenService, raumService);
  return { klassenService, raumService, sitzplanService };
}

async function quellen(userId: string, suffix: string) {
  const { klassenService, raumService } = dienste();
  const klasse = await klassenService.create(userId, { name: `Fantasieklasse ${suffix}` });
  const raum = await raumService.create(userId, {
    name: `Fantasieraum ${suffix}`,
    breiteCm: 800,
    laengeCm: 600,
    rasterCm: 50,
  });
  await raumService.addObjekt(userId, raum.id, { typ: 'table_double' });
  return { klasse, raum };
}

lauf('M3-56 Sitzplan-Grundlage gegen Test-PostgreSQL', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    const db = getDb();
    // Testnutzer (Fantasiedaten); Klassen, Räume und Sitzpläne hängen per
    // ON DELETE CASCADE daran.
    await db.delete(users).where(eq(users.id, USER_A));
    await db.delete(users).where(eq(users.id, USER_B));
    await db.insert(users).values([
      { id: USER_A, email: 'm3-56-a@example.test', passwordHash: 'fantasie' },
      { id: USER_B, email: 'm3-56-b@example.test', passwordHash: 'fantasie' },
    ]);
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(users).where(eq(users.id, USER_A));
    await db.delete(users).where(eq(users.id, USER_B));
    await closeDb();
  });

  it('friert die Raumgeometrie ein: spätere Vorlagenänderungen verändern den Plan nicht', async () => {
    const { raumService, sitzplanService } = dienste();
    const { klasse, raum } = await quellen(USER_A, 'Snapshot');

    const plan = await sitzplanService.create(USER_A, {
      name: 'Fantasieplan Snapshot',
      klasseId: klasse.id,
      raumId: raum.id,
    });
    expect(plan.revision).toBe(1);
    expect(plan.dokumentVersion).toBe(1);
    const eingefroren = structuredClone(plan.canvasDocument);
    expect(eingefroren.raumGeometrie.objekte).toHaveLength(1);
    expect(eingefroren.raumGeometrie.sitzplaetze).toHaveLength(2);

    // Raumvorlage separat ändern
    await raumService.addObjekt(USER_A, raum.id, { typ: 'board' });
    await raumService.update(USER_A, raum.id, { rasterCm: 25, name: 'Fantasieraum Snapshot v2' });

    // Sitzplan erneut laden — mit frischen Instanzen (Browser-Neuladen)
    const nachReload = await dienste().sitzplanService.getById(USER_A, plan.id);
    expect(nachReload.canvasDocument).toEqual(eingefroren);
    expect(nachReload.canvasDocument.raumGeometrie.rasterCm).toBe(50);
    expect(nachReload.canvasDocument.raumGeometrie.objekte).toHaveLength(1);
  });

  it('persistiert ein Konva-freies Dokument, das gegen die veröffentlichte Version validiert', async () => {
    const { sitzplanService } = dienste();
    const { klasse, raum } = await quellen(USER_A, 'JSONB');
    const plan = await sitzplanService.create(USER_A, {
      name: 'Fantasieplan JSONB',
      klasseId: klasse.id,
      raumId: raum.id,
    });

    const db = getDb();
    const [row] = await db.select().from(sitzplaene).where(eq(sitzplaene.id, plan.id));
    const roh = row.canvasDocument as Record<string, unknown>;

    expect(Object.keys(roh).sort()).toEqual(['quelle', 'raumGeometrie', 'version', 'zuordnungen']);
    expect(roh.version).toBe(1);
    expect(roh.zuordnungen).toEqual([]);
    expect(roh.quelle).toEqual({ klasseId: klasse.id, raumId: raum.id });

    const rohJson = JSON.stringify(roh);
    expect(rohJson).not.toContain('Konva');
    expect(rohJson).not.toContain('attrs');
    expect(rohJson).not.toContain('className');
    expect(JSON.parse(rohJson)).toEqual(roh);
  });

  it('setzt Ownership über den gesamten Lebenszyklus durch', async () => {
    const { sitzplanService } = dienste();
    const { klasse, raum } = await quellen(USER_A, 'Ownership');
    const plan = await sitzplanService.create(USER_A, {
      name: 'Fantasieplan Ownership',
      klasseId: klasse.id,
      raumId: raum.id,
    });

    const lesen = await sitzplanService.getById(USER_B, plan.id).catch((e) => e);
    expect(lesen).toBeInstanceOf(SitzplanError);
    expect(lesen.code).toBe('FORBIDDEN');

    const umbenennen = await sitzplanService.update(USER_B, plan.id, { name: 'Uebernommen' }).catch((e) => e);
    expect(umbenennen).toBeInstanceOf(SitzplanError);
    expect(umbenennen.code).toBe('FORBIDDEN');

    expect((await sitzplanService.list(USER_B)).some((p) => p.id === plan.id)).toBe(false);

    // Fremde Quellen dürfen nicht in einen eigenen Plan kopiert werden
    const fremd = await quellen(USER_B, 'Fremd');
    const fremdeKlasse = await sitzplanService
      .create(USER_A, { name: 'Klau', klasseId: fremd.klasse.id, raumId: raum.id })
      .catch((e) => e);
    expect(fremdeKlasse).toBeInstanceOf(SitzplanError);
    expect(fremdeKlasse.code).toBe('FORBIDDEN');

    const fremderRaum = await sitzplanService
      .create(USER_A, { name: 'Klau', klasseId: klasse.id, raumId: fremd.raum.id })
      .catch((e) => e);
    expect(fremderRaum).toBeInstanceOf(SitzplanError);
    expect(fremderRaum.code).toBe('FORBIDDEN');
  });

  it('benennt um, ohne die Revision zu erhöhen, und soft-löscht ohne Datenverlust', async () => {
    const { sitzplanService } = dienste();
    const { klasse, raum } = await quellen(USER_A, 'Lifecycle');
    const plan = await sitzplanService.create(USER_A, {
      name: 'Fantasieplan Lifecycle',
      klasseId: klasse.id,
      raumId: raum.id,
    });
    const eingefroren = structuredClone(plan.canvasDocument);

    const umbenannt = await sitzplanService.update(USER_A, plan.id, { name: 'Fantasieplan Lifecycle v2' });
    expect(umbenannt.name).toBe('Fantasieplan Lifecycle v2');
    expect(umbenannt.revision).toBe(1);
    expect(umbenannt.canvasDocument).toEqual(eingefroren);

    await sitzplanService.delete(USER_A, plan.id);
    expect((await sitzplanService.list(USER_A)).some((p) => p.id === plan.id)).toBe(false);

    const nichtGefunden = await sitzplanService.getById(USER_A, plan.id).catch((e) => e);
    expect(nichtGefunden).toBeInstanceOf(SitzplanError);
    expect(nichtGefunden.code).toBe('NOT_FOUND');

    // Soft-Delete: Datensatz und Dokument bleiben vollständig erhalten.
    const db = getDb();
    const [row] = await db.select().from(sitzplaene).where(eq(sitzplaene.id, plan.id));
    expect(row).toBeDefined();
    expect(row.deletedAt).not.toBeNull();
    expect(row.name).toBe('Fantasieplan Lifecycle v2');
    expect(row.canvasDocument).toEqual(eingefroren);
  });
});
