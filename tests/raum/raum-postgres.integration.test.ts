import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, closeDb } from '../../src/infrastructure/db/client';
import { raeume, users } from '../../src/infrastructure/db/schema';
import { DrizzleRaumRepository } from '../../src/infrastructure/db/raum-repository';
import { RaumService, RaumError, migriereRaumDokument } from '../../src/domain/raum';
import { RAUM_OBJEKT_TYPEN } from '../../src/domain/raum/objekte';

// M2-Akzeptanz (M2 #55): Der vollständige Akzeptanzpfad läuft gegen eine
// echte PostgreSQL-Instanz mit Test-/Fantasiedaten. Der Test ist opt-in:
// ohne TEST_DATABASE_URL wird er übersprungen (CI ohne Service-Container
// bleibt grün); lokal läuft er gegen die Docker-Compose-Datenbank:
//   TEST_DATABASE_URL="$DATABASE_URL" bun run test
const TEST_DB = process.env.TEST_DATABASE_URL;
const lauf = describe.skipIf(!TEST_DB);

const USER_A = 'user_m2akzeptanz_a';
const USER_B = 'user_m2akzeptanz_b';

lauf('M2-Akzeptanzpfad gegen Test-PostgreSQL (M2 #55)', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    const db = getDb();
    // Testnutzer (Fantasiedaten); Räume hängen per ON DELETE CASCADE daran.
    await db.delete(users).where(eq(users.id, USER_A));
    await db.delete(users).where(eq(users.id, USER_B));
    await db.insert(users).values([
      { id: USER_A, email: 'm2-akzeptanz-a@example.test', passwordHash: 'fantasie' },
      { id: USER_B, email: 'm2-akzeptanz-b@example.test', passwordHash: 'fantasie' },
    ]);
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(users).where(eq(users.id, USER_A));
    await db.delete(users).where(eq(users.id, USER_B));
    await closeDb();
  });

  it('durchläuft den kompletten Pfad und rekonstruiert nach Reload denselben Stand', async () => {
    const service = new RaumService(new DrizzleRaumRepository());

    // anlegen → Maße/Raster setzen
    const raum = await service.create(USER_A, {
      name: 'M2-Akzeptanzraum (Fantasie)',
      breiteCm: 800,
      laengeCm: 600,
      rasterCm: 50,
    });

    // alle Standardobjekte hinzufügen
    let stand = raum;
    for (const typ of RAUM_OBJEKT_TYPEN) {
      stand = await service.addObjekt(USER_A, raum.id, { typ });
    }
    expect(migriereRaumDokument(stand.canvasDocument).objekte).toHaveLength(6);

    // Tisch verschieben und drehen → duplizieren → Objekt löschen.
    // Hinweis: Das Duplikat sucht nur ±1 Rasterzelle — bei einem 60×50-cm-
    // Tisch funktioniert das nur mit Raster ≥ 50 cm, darum duplizieren wir
    // noch vor dem Rasterwechsel auf 25 cm (Domain-Regel, kein Test-Hack).
    const einzeltisch = migriereRaumDokument(stand.canvasDocument).objekte.find((o) => o.typ === 'table_single')!;
    // Freie Fläche rechts unten — das Duplikat sucht nur ±1 Rasterzelle
    await service.bewegeObjekt(USER_A, raum.id, einzeltisch.id, { x_cm: 650, y_cm: 450 });
    await service.rotiereObjekt(USER_A, raum.id, einzeltisch.id);
    const dupliziert = await service.dupliziereObjekt(USER_A, raum.id, einzeltisch.id);
    const kopie = migriereRaumDokument(dupliziert.canvasDocument).objekte.find((o) => o.id !== einzeltisch.id && o.typ === 'table_single')!;
    const fenster = migriereRaumDokument(dupliziert.canvasDocument).objekte.find((o) => o.typ === 'window')!;
    await service.entferneObjekt(USER_A, raum.id, fenster.id);
    await service.update(USER_A, raum.id, { rasterCm: 25 });

    // Sitzplätze prüfen: 3 Tische (Einzel, Doppel, Einzel-Kopie) → 1+2+1
    const vorReload = migriereRaumDokument((await service.getById(USER_A, raum.id)).canvasDocument);
    expect(vorReload.sitzplaetze).toHaveLength(4);
    expect(vorReload.sitzplaetze.filter((s) => s.objektId === kopie.id)).toHaveLength(1);
    expect(new Set(vorReload.sitzplaetze.map((s) => s.id)).size).toBe(4);

    // Browser-Neuladen: neue Service-Instanz, identischer validierter Stand
    const reloadService = new RaumService(new DrizzleRaumRepository());
    const nachReload = migriereRaumDokument((await reloadService.getById(USER_A, raum.id)).canvasDocument);
    expect(nachReload).toEqual(vorReload);
    expect(nachReload.rasterCm).toBe(25);
    expect(nachReload.objekte.find((o) => o.id === einzeltisch.id)!.rotation_deg).toBe(90);
    expect(nachReload.sitzplaetze.map((s) => s.id)).toEqual(vorReload.sitzplaetze.map((s) => s.id));
  });

  it('persistiertes JSONB enthält keine Konva-Knoten und validiert gegen die veröffentlichte Dokumentversion', async () => {
    const service = new RaumService(new DrizzleRaumRepository());
    const raum = await service.create(USER_A, { name: 'JSONB-Check', breiteCm: 600, laengeCm: 400, rasterCm: 50 });
    await service.addObjekt(USER_A, raum.id, { typ: 'table_double' });

    const db = getDb();
    const [row] = await db.select().from(raeume).where(eq(raeume.id, raum.id));
    const roh = row.canvasDocument as Record<string, unknown>;

    // Nur Vertragsschlüssel — keine Renderer-Artefakte (Konva-Nodes, ids/attrs)
    expect(Object.keys(roh).sort()).toEqual(['breiteCm', 'laengeCm', 'objekte', 'rasterCm', 'sitzplaetze', 'version']);
    const rohJson = JSON.stringify(roh);
    expect(rohJson).not.toContain('Konva');
    expect(rohJson).not.toContain('attrs');
    expect(rohJson).not.toContain('className');
    // JSON-Roundtrip verlustfrei — keine Klasseninstanzen
    expect(JSON.parse(rohJson)).toEqual(roh);
  });

  it('liest einen V1-Bestandsstand und migriert ihn beim nächsten Write validiert nach V3', async () => {
    const service = new RaumService(new DrizzleRaumRepository());
    const raum = await service.create(USER_A, { name: 'V1-Bestand', breiteCm: 800, laengeCm: 600, rasterCm: 50 });

    // Simuliert den veröffentlichten V1-Bestand direkt im JSONB
    const db = getDb();
    await db
      .update(raeume)
      .set({
        dokumentVersion: 1,
        canvasDocument: { version: 1, breiteCm: 800, laengeCm: 600, rasterCm: 50, objekte: [] },
        updatedAt: new Date(),
      })
      .where(eq(raeume.id, raum.id));

    const migriert = await service.addObjekt(USER_A, raum.id, { typ: 'table_single' });
    expect(migriert.dokumentVersion).toBe(3);
    const dok = migriereRaumDokument(migriert.canvasDocument);
    expect(dok.version).toBe(3);
    expect(dok.objekte).toHaveLength(1);
    expect(dok.sitzplaetze).toHaveLength(1);
  });

  it('wehrt fremde Zugriffe ab: weder lesen noch ändern durch andere Benutzer', async () => {
    const service = new RaumService(new DrizzleRaumRepository());
    const raum = await service.create(USER_A, { name: 'Ownership', breiteCm: 600, laengeCm: 400, rasterCm: 50 });

    const lesen = await service.getById(USER_B, raum.id).catch((e) => e);
    expect(lesen).toBeInstanceOf(RaumError);
    expect(lesen.code).toBe('FORBIDDEN');

    const aendern = await service.update(USER_B, raum.id, { name: 'Uebernommen' }).catch((e) => e);
    expect(aendern).toBeInstanceOf(RaumError);
    expect(aendern.code).toBe('FORBIDDEN');

    const liste = await service.list(USER_B);
    expect(liste.some((r) => r.id === raum.id)).toBe(false);

    expect((await service.getById(USER_A, raum.id)).name).toBe('Ownership');
  });

  it('lehnt Schreibvorgänge auf ein ungültiges persistiertes Dokument stabil ab', async () => {
    const service = new RaumService(new DrizzleRaumRepository());
    const raum = await service.create(USER_A, { name: 'Kaputt', breiteCm: 600, laengeCm: 400, rasterCm: 50 });

    const db = getDb();
    await db
      .update(raeume)
      .set({ canvasDocument: { version: 99, kaputt: true } as never, updatedAt: new Date() })
      .where(eq(raeume.id, raum.id));

    const err = await service.addObjekt(USER_A, raum.id, { typ: 'table_single' }).catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('erzwingt die Raumgrenzen: Objekte außerhalb werden verständlich abgelehnt', async () => {
    const service = new RaumService(new DrizzleRaumRepository());
    // 300 × 200 cm — die 400 cm breite Tafel passt nicht hinein
    const raum = await service.create(USER_A, { name: 'Eng', breiteCm: 300, laengeCm: 200, rasterCm: 50 });

    const err = await service.addObjekt(USER_A, raum.id, { typ: 'board' }).catch((e) => e);
    expect(err).toBeInstanceOf(RaumError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toContain('passt');
  });
});
