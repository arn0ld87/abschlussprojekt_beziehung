import { describe, it, expect, beforeEach } from 'vitest';
import { SchuelerService, SchuelerError } from '../../src/domain/schueler';
import { SitzregelService, SitzregelError } from '../../src/domain/sitzregel';
import { KlassenService } from '../../src/domain/klasse';
import { InMemoryKlassenRepository } from '../../src/infrastructure/db/in-memory-klassen-repository';
import { InMemorySchuelerRepository } from '../../src/infrastructure/db/in-memory-schueler-repository';
import { InMemorySitzregelRepository } from '../../src/infrastructure/db/in-memory-sitzregel-repository';

describe('Schueler & Sitzregel Services', () => {
  let klassenRepo: InMemoryKlassenRepository;
  let klassenService: KlassenService;
  let schuelerRepo: InMemorySchuelerRepository;
  let schuelerService: SchuelerService;
  let sitzregelRepo: InMemorySitzregelRepository;
  let sitzregelService: SitzregelService;

  beforeEach(() => {
    klassenRepo = new InMemoryKlassenRepository();
    klassenService = new KlassenService(klassenRepo);
    schuelerRepo = new InMemorySchuelerRepository();
    schuelerService = new SchuelerService(schuelerRepo, klassenService);
    sitzregelRepo = new InMemorySitzregelRepository();
    sitzregelService = new SitzregelService(sitzregelRepo, schuelerService, klassenService);
  });

  it('creates a schueler successfully', async () => {
    const k = await klassenService.create('u1', { name: '8a' });
    const s = await schuelerService.create('u1', k.id, {
      name: 'Max Mustermann',
      initialen: 'MM',
      farbe: '#4F46E5',
    });
    expect(s.id).toMatch(/^sch_/);
    expect(s.name).toBe('Max Mustermann');
    expect(s.initialen).toBe('MM');
    expect(s.klasseId).toBe(k.id);
  });

  it('autogenerates initialen if omitted', async () => {
    const k = await klassenService.create('u1', { name: '8a' });
    const s = await schuelerService.create('u1', k.id, { name: 'Erika Muster' });
    expect(s.initialen).toBe('EM');
  });

  it('fails creation if student name is empty', async () => {
    const k = await klassenService.create('u1', { name: '8a' });
    await expect(schuelerService.create('u1', k.id, { name: '' })).rejects.toThrow(SchuelerError);
  });

  it('fails creation for other user class', async () => {
    const k = await klassenService.create('u1', { name: '8a' });
    await expect(schuelerService.create('u2', k.id, { name: 'Anna' })).rejects.toThrow(Error);
  });

  it('lists schueler sorted alphabetically', async () => {
    const k = await klassenService.create('u1', { name: '8a' });
    await schuelerService.create('u1', k.id, { name: 'Zoe' });
    await schuelerService.create('u1', k.id, { name: 'Adam' });
    await schuelerService.create('u1', k.id, { name: 'Berta' });

    const list = await schuelerService.list('u1', k.id);
    expect(list.map((s) => s.name)).toEqual(['Adam', 'Berta', 'Zoe']);
  });

  it('soft deletes a schueler', async () => {
    const k = await klassenService.create('u1', { name: '8a' });
    const s = await schuelerService.create('u1', k.id, { name: 'Max' });
    await schuelerService.delete('u1', k.id, s.id);

    const list = await schuelerService.list('u1', k.id);
    expect(list).toHaveLength(0);

    await expect(schuelerService.getById('u1', k.id, s.id)).rejects.toThrow(SchuelerError);
  });

  it('creates valid sitzregel for position (front_seat)', async () => {
    const k = await klassenService.create('u1', { name: '8a' });
    const s = await schuelerService.create('u1', k.id, { name: 'Max' });

    const r = await sitzregelService.create('u1', k.id, s.id, {
      typ: 'front_seat',
      haerte: 'hard',
    });

    expect(r.id).toMatch(/^stz_/);
    expect(r.schuelerId).toBe(s.id);
    expect(r.typ).toBe('front_seat');
    expect(r.haerte).toBe('hard');
    expect(r.gewicht).toBeNull();
  });

  it('creates valid sitzregel for peer (near_to)', async () => {
    const k = await klassenService.create('u1', { name: '8a' });
    const s1 = await schuelerService.create('u1', k.id, { name: 'Max' });
    const s2 = await schuelerService.create('u1', k.id, { name: 'Anna' });

    const r = await sitzregelService.create('u1', k.id, s1.id, {
      typ: 'near_to',
      targetSchuelerId: s2.id,
      haerte: 'weighted',
      gewicht: 0.8,
    });

    expect(r.targetSchuelerId).toBe(s2.id);
    expect(r.haerte).toBe('weighted');
    expect(r.gewicht).toBe(0.8);
  });

  it('rejects sitzregel with peer in different class', async () => {
    const k1 = await klassenService.create('u1', { name: '8a' });
    const k2 = await klassenService.create('u1', { name: '8b' });
    const s1 = await schuelerService.create('u1', k1.id, { name: 'Max' });
    const s2 = await schuelerService.create('u1', k2.id, { name: 'Anna' });

    await expect(
      sitzregelService.create('u1', k1.id, s1.id, {
        typ: 'near_to',
        targetSchuelerId: s2.id,
        haerte: 'hard',
      })
    ).rejects.toThrow(Error);
  });

  it('rejects duplicate near_to rule for same pair', async () => {
    const k = await klassenService.create('u1', { name: '8a' });
    const s1 = await schuelerService.create('u1', k.id, { name: 'Max' });
    const s2 = await schuelerService.create('u1', k.id, { name: 'Anna' });

    await sitzregelService.create('u1', k.id, s1.id, {
      typ: 'near_to',
      targetSchuelerId: s2.id,
      haerte: 'hard',
    });

    // Attempting symmetric duplicate from s2 -> s1
    await expect(
      sitzregelService.create('u1', k.id, s2.id, {
        typ: 'near_to',
        targetSchuelerId: s1.id,
        haerte: 'hard',
      })
    ).rejects.toThrow(SitzregelError);
  });

  it('rejects sitzregel with self as target', async () => {
    const k = await klassenService.create('u1', { name: '8a' });
    const s1 = await schuelerService.create('u1', k.id, { name: 'Max' });

    await expect(
      sitzregelService.create('u1', k.id, s1.id, {
        typ: 'near_to',
        targetSchuelerId: s1.id,
        haerte: 'hard',
      })
    ).rejects.toThrow(SitzregelError);
  });
});
