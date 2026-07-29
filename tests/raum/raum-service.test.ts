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
    expect(r.dokumentVersion).toBe(1);
    expect(r.canvasDocument.version).toBe(1);
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
    expect(updated.canvasDocument.version).toBe(1);
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
    expect(data.canvasDocument).toMatchObject({ version: 1, breiteCm: 800, laengeCm: 600, rasterCm: 25 });
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
});
