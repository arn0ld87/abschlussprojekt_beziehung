import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getList, POST as create } from '../../app/api/sitzplaene/route';
import { GET as getDetail, PATCH as update, DELETE as remove } from '../../app/api/sitzplaene/[id]/route';
import { setGlobalSitzplanService, getDefaultSitzplanService } from '../../src/services/sitzplan';
import { setGlobalKlassenService } from '../../src/services/klasse';
import { setGlobalRaumService } from '../../src/services/raum';
import { setGlobalAuthService } from '../../src/services/auth';
import { AuthService } from '../../src/services/auth/auth-service';
import { InMemoryAuthRepository } from '../../src/infrastructure/auth/in-memory-repository';
import { KlassenService } from '../../src/domain/klasse';
import { RaumService } from '../../src/domain/raum';
import { SitzplanService } from '../../src/domain/sitzplan';
import { InMemoryKlassenRepository } from '../../src/infrastructure/db/in-memory-klassen-repository';
import { InMemoryRaumRepository } from '../../src/infrastructure/db/in-memory-raum-repository';
import { InMemorySitzplanRepository } from '../../src/infrastructure/db/in-memory-sitzplan-repository';
import { User } from '../../src/domain/auth';

describe('Sitzplaene Routes (M3 #56)', () => {
  let authRepo: InMemoryAuthRepository;
  let klassenService: KlassenService;
  let raumService: RaumService;
  let currentSessionToken = '';

  beforeEach(async () => {
    currentSessionToken = '';

    klassenService = new KlassenService(new InMemoryKlassenRepository());
    raumService = new RaumService(new InMemoryRaumRepository());
    setGlobalKlassenService(klassenService);
    setGlobalRaumService(raumService);
    setGlobalSitzplanService(new SitzplanService(new InMemorySitzplanRepository(), klassenService, raumService));

    authRepo = new InMemoryAuthRepository();
    setGlobalAuthService(new AuthService(authRepo));
  });

  const mockUser: User = { id: 'u1', email: 'test@test.com', createdAt: new Date(), updatedAt: new Date() };

  async function quellen(userId = 'u1') {
    const klasse = await klassenService.create(userId, { name: 'Fantasieklasse 8a' });
    const raum = await raumService.create(userId, {
      name: 'Fantasieraum',
      breiteCm: 800,
      laengeCm: 600,
      rasterCm: 50,
    });
    await raumService.addObjekt(userId, raum.id, { typ: 'table_single' });
    return { klasseId: klasse.id, raumId: raum.id };
  }

  async function setSession(user: User | null) {
    if (user) {
      await authRepo.createUser({ id: user.id, email: user.email, passwordHash: 'hash' });
      const session = await authRepo.createSession({
        id: 's1',
        userId: user.id,
        expiresAt: new Date(Date.now() + 100000),
      });
      currentSessionToken = session.id;
    } else {
      currentSessionToken = '';
    }
  }

  function req(method: string, body?: unknown) {
    const headers = new Headers();
    if (currentSessionToken) {
      headers.set('Cookie', `sitzplan_session=${currentSessionToken}`);
    }
    return new NextRequest('http://localhost/api/sitzplaene', {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it('GET /api/sitzplaene 401 unauth', async () => {
    await setSession(null);
    expect((await getList(req('GET'))).status).toBe(401);
  });

  it('GET /api/sitzplaene 200 ok, ohne soft-gelöschte und fremde Pläne', async () => {
    await setSession(mockUser);
    const service = getDefaultSitzplanService();
    const eigen = await quellen('u1');
    const fremd = await quellen('other');

    const plan = await service.create('u1', { name: 'Eigener Plan', ...eigen });
    await service.create('other', { name: 'Fremder Plan', ...fremd });
    const geloescht = await service.create('u1', { name: 'Gelöschter Plan', ...eigen });
    await service.delete('u1', geloescht.id);

    const res = await getList(req('GET'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(plan.id);
  });

  it('GET /api/sitzplaene 500 error path', async () => {
    await setSession(mockUser);
    const service = getDefaultSitzplanService();
    const listSpy = vi.spyOn(service, 'list').mockRejectedValueOnce(new Error('Test error'));

    const res = await getList(req('GET'));
    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe('INTERNAL_ERROR');

    listSpy.mockRestore();
  });

  it('POST /api/sitzplaene 401 unauth', async () => {
    await setSession(null);
    expect((await create(req('POST', { name: 'X', klasseId: 'k', raumId: 'r' }))).status).toBe(401);
  });

  it('POST /api/sitzplaene 201 created mit eingefrorener Geometrie', async () => {
    await setSession(mockUser);
    const { klasseId, raumId } = await quellen('u1');

    const res = await create(req('POST', { name: 'Fantasieplan', klasseId, raumId }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('Fantasieplan');
    expect(data.revision).toBe(1);
    expect(data.dokumentVersion).toBe(1);
    expect(data.canvasDocument.version).toBe(1);
    expect(data.canvasDocument.quelle).toEqual({ klasseId, raumId });
    expect(data.canvasDocument.zuordnungen).toEqual([]);
    expect(data.canvasDocument.raumGeometrie.objekte).toHaveLength(1);
    expect(data.canvasDocument.raumGeometrie.sitzplaetze).toHaveLength(1);
  });

  it('POST /api/sitzplaene 422 invalid input', async () => {
    await setSession(mockUser);
    const { klasseId, raumId } = await quellen('u1');
    expect((await create(req('POST', { name: '', klasseId, raumId }))).status).toBe(422);
    expect((await create(req('POST', { name: 'Plan', raumId }))).status).toBe(422);
    expect((await create(req('POST', { name: 'Plan', klasseId }))).status).toBe(422);
  });

  it('POST /api/sitzplaene 404 für unbekannte Klasse oder Raumvorlage', async () => {
    await setSession(mockUser);
    const { klasseId, raumId } = await quellen('u1');
    expect((await create(req('POST', { name: 'Plan', klasseId: 'kls_weg', raumId }))).status).toBe(404);
    expect((await create(req('POST', { name: 'Plan', klasseId, raumId: 'raum_weg' }))).status).toBe(404);
  });

  it('POST /api/sitzplaene 403 für fremde Klasse oder Raumvorlage', async () => {
    await setSession(mockUser);
    const eigen = await quellen('u1');
    const fremd = await quellen('other');

    expect((await create(req('POST', { name: 'Plan', klasseId: fremd.klasseId, raumId: eigen.raumId }))).status).toBe(403);
    expect((await create(req('POST', { name: 'Plan', klasseId: eigen.klasseId, raumId: fremd.raumId }))).status).toBe(403);
  });

  it('GET /api/sitzplaene/[id] 200 ok', async () => {
    await setSession(mockUser);
    const q = await quellen('u1');
    const plan = await getDefaultSitzplanService().create('u1', { name: 'Fantasieplan', ...q });

    const res = await getDetail(req('GET'), { params: Promise.resolve({ id: plan.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe('Fantasieplan');
  });

  it('GET /api/sitzplaene/[id] 404 not found', async () => {
    await setSession(mockUser);
    const res = await getDetail(req('GET'), { params: Promise.resolve({ id: 'plan_missing' }) });
    expect(res.status).toBe(404);
  });

  it('GET /api/sitzplaene/[id] 403 other user', async () => {
    await setSession(mockUser);
    const q = await quellen('other');
    const plan = await getDefaultSitzplanService().create('other', { name: 'Fremd', ...q });

    const res = await getDetail(req('GET'), { params: Promise.resolve({ id: plan.id }) });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/sitzplaene/[id] 200 ok — benennt um, Revision bleibt', async () => {
    await setSession(mockUser);
    const q = await quellen('u1');
    const plan = await getDefaultSitzplanService().create('u1', { name: 'Fantasieplan', ...q });

    const res = await update(req('PATCH', { name: 'Umbenannt' }), { params: Promise.resolve({ id: plan.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Umbenannt');
    expect(data.revision).toBe(1);
    expect(data.canvasDocument).toEqual(JSON.parse(JSON.stringify(plan.canvasDocument)));
  });

  it('PATCH /api/sitzplaene/[id] 401 unauth', async () => {
    await setSession(null);
    const res = await update(req('PATCH', { name: 'X' }), { params: Promise.resolve({ id: 'any' }) });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/sitzplaene/[id] 403 other user', async () => {
    await setSession(mockUser);
    const q = await quellen('other');
    const plan = await getDefaultSitzplanService().create('other', { name: 'Fremd', ...q });

    const res = await update(req('PATCH', { name: 'X' }), { params: Promise.resolve({ id: plan.id }) });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/sitzplaene/[id] 404 not found', async () => {
    await setSession(mockUser);
    const res = await update(req('PATCH', { name: 'X' }), { params: Promise.resolve({ id: 'plan_missing' }) });
    expect(res.status).toBe(404);
  });

  it('PATCH /api/sitzplaene/[id] 422 invalid input', async () => {
    await setSession(mockUser);
    const q = await quellen('u1');
    const plan = await getDefaultSitzplanService().create('u1', { name: 'Fantasieplan', ...q });

    const res = await update(req('PATCH', { name: '' }), { params: Promise.resolve({ id: plan.id }) });
    expect(res.status).toBe(422);
  });

  it('DELETE /api/sitzplaene/[id] 204 ok und danach nicht mehr listbar', async () => {
    await setSession(mockUser);
    const q = await quellen('u1');
    const plan = await getDefaultSitzplanService().create('u1', { name: 'Fantasieplan', ...q });

    const res = await remove(req('DELETE'), { params: Promise.resolve({ id: plan.id }) });
    expect(res.status).toBe(204);
    expect(await (await getList(req('GET'))).json()).toHaveLength(0);
  });

  it('DELETE /api/sitzplaene/[id] 401 unauth', async () => {
    await setSession(null);
    const res = await remove(req('DELETE'), { params: Promise.resolve({ id: 'any' }) });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/sitzplaene/[id] 403 other user', async () => {
    await setSession(mockUser);
    const q = await quellen('other');
    const plan = await getDefaultSitzplanService().create('other', { name: 'Fremd', ...q });

    const res = await remove(req('DELETE'), { params: Promise.resolve({ id: plan.id }) });
    expect(res.status).toBe(403);
  });

  it('DELETE /api/sitzplaene/[id] 404 not found', async () => {
    await setSession(mockUser);
    const res = await remove(req('DELETE'), { params: Promise.resolve({ id: 'plan_missing' }) });
    expect(res.status).toBe(404);
  });
});
