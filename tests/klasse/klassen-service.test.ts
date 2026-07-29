import { describe, it, expect, beforeEach } from 'vitest';
import { KlassenService, KlasseError } from '../../src/domain/klasse';
import { InMemoryKlassenRepository } from '../../src/infrastructure/db/in-memory-klassen-repository';

describe('KlassenService', () => {
  let repo: InMemoryKlassenRepository;
  let service: KlassenService;

  beforeEach(() => {
    repo = new InMemoryKlassenRepository();
    service = new KlassenService(repo);
  });

  it('creates a klasse successfully', async () => {
    const k = await service.create('u1', { name: 'Klasse 1', notizen: 'Test' });
    expect(k.id).toMatch(/^kls_/);
    expect(k.name).toBe('Klasse 1');
    expect(k.userId).toBe('u1');
  });

  it('fails creation with empty name', async () => {
    await expect(service.create('u1', { name: '' })).rejects.toThrow(KlasseError);
  });

  it('fails creation with whitespace-only name', async () => {
    await expect(service.create('u1', { name: '   ' })).rejects.toThrow(KlasseError);
  });

  it('lists own active klassen', async () => {
    await service.create('u1', { name: 'K1' });
    await service.create('u1', { name: 'K2' });
    await service.create('u2', { name: 'K3' }); // other user

    const k1List = await service.list('u1');
    expect(k1List).toHaveLength(2);
  });

  it('gets by id successfully', async () => {
    const k = await service.create('u1', { name: 'K1' });
    const fetched = await service.getById('u1', k.id);
    expect(fetched.id).toBe(k.id);
  });

  it('fails getById for other user', async () => {
    const k = await service.create('u1', { name: 'K1' });
    await expect(service.getById('u2', k.id)).rejects.toThrow(KlasseError);
  });

  it('updates successfully', async () => {
    const k = await service.create('u1', { name: 'K1' });
    const updated = await service.update('u1', k.id, { name: 'K1 Neu' });
    expect(updated.name).toBe('K1 Neu');
  });

  it('soft deletes successfully', async () => {
    const k = await service.create('u1', { name: 'K1' });
    await service.delete('u1', k.id);

    const list = await service.list('u1');
    expect(list).toHaveLength(0);

    await expect(service.getById('u1', k.id)).rejects.toThrow(KlasseError);
  });
});
