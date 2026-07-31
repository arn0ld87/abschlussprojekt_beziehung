import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getList, POST as create } from '../../app/api/raeume/route';
import { GET as getDetail, PATCH as update, DELETE as remove } from '../../app/api/raeume/[id]/route';
import { setGlobalRaumService, getDefaultRaumService } from '../../src/services/raum';
import { setGlobalAuthService } from '../../src/services/auth';
import { AuthService } from '../../src/services/auth/auth-service';
import { InMemoryAuthRepository } from '../../src/infrastructure/auth/in-memory-repository';
import { RaumService } from '../../src/domain/raum';
import { InMemoryRaumRepository } from '../../src/infrastructure/db/in-memory-raum-repository';
import { User } from '../../src/domain/auth';

describe('Raeume Routes', () => {
  let raumRepo: InMemoryRaumRepository;
  let authRepo: InMemoryAuthRepository;
  let currentSessionToken = '';

  beforeEach(async () => {
    currentSessionToken = '';
    raumRepo = new InMemoryRaumRepository();
    const raumService = new RaumService(raumRepo);
    setGlobalRaumService(raumService);

    authRepo = new InMemoryAuthRepository();
    const authService = new AuthService(authRepo);
    setGlobalAuthService(authService);
  });

  const mockUser: User = { id: 'u1', email: 'test@test.com', createdAt: new Date(), updatedAt: new Date() };
  const gueltig = { name: 'Raum 1', breiteCm: 800, laengeCm: 600, rasterCm: 50 };

  async function setSession(user: User | null) {
    if (user) {
      await authRepo.createUser({ id: user.id, email: user.email, passwordHash: 'hash' });
      const session = await authRepo.createSession({ id: 's1', userId: user.id, expiresAt: new Date(Date.now() + 100000) });
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
    return new NextRequest('http://localhost/api/raeume', {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it('GET /api/raeume 401 unauth', async () => {
    await setSession(null);
    const res = await getList(req('GET'));
    expect(res.status).toBe(401);
  });

  it('GET /api/raeume 200 ok, ohne soft-gelöschte und fremde Räume', async () => {
    await setSession(mockUser);
    const service = getDefaultRaumService();
    const eigen = await service.create('u1', gueltig);
    await service.create('other', { ...gueltig, name: 'Fremd' });
    await service.delete('u1', (await service.create('u1', { ...gueltig, name: 'Gelöscht' })).id);

    const res = await getList(req('GET'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(eigen.id);
  });

  it('GET /api/raeume 500 error path', async () => {
    await setSession(mockUser);
    const service = getDefaultRaumService();
    const listSpy = vi.spyOn(service, 'list').mockRejectedValueOnce(new Error('Test error'));

    const res = await getList(req('GET'));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.code).toBe('INTERNAL_ERROR');

    listSpy.mockRestore();
  });

  it('POST /api/raeume 401 unauth', async () => {
    await setSession(null);
    const res = await create(req('POST', gueltig));
    expect(res.status).toBe(401);
  });

  it('POST /api/raeume 201 created mit RaumDokumentV1', async () => {
    await setSession(mockUser);
    const res = await create(req('POST', gueltig));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('Raum 1');
    expect(data.dokumentVersion).toBe(3);
    expect(data.canvasDocument.version).toBe(3);
    expect(data.canvasDocument.objekte).toEqual([]);
  });

  it('POST /api/raeume 422 invalid input', async () => {
    await setSession(mockUser);
    expect((await create(req('POST', { ...gueltig, name: '' }))).status).toBe(422);
    expect((await create(req('POST', { ...gueltig, breiteCm: -1 }))).status).toBe(422);
    expect((await create(req('POST', { ...gueltig, rasterCm: 9999 }))).status).toBe(422);
  });

  it('GET /api/raeume/[id] 200 ok', async () => {
    await setSession(mockUser);
    const r = await getDefaultRaumService().create('u1', gueltig);
    const res = await getDetail(req('GET'), { params: Promise.resolve({ id: r.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Raum 1');
  });

  it('GET /api/raeume/[id] 404 not found', async () => {
    await setSession(mockUser);
    const res = await getDetail(req('GET'), { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });

  it('GET /api/raeume/[id] 403 other user', async () => {
    await setSession(mockUser);
    const r = await getDefaultRaumService().create('other', gueltig);
    const res = await getDetail(req('GET'), { params: Promise.resolve({ id: r.id }) });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/raeume/[id] 200 ok', async () => {
    await setSession(mockUser);
    const r = await getDefaultRaumService().create('u1', gueltig);
    const res = await update(req('PATCH', { name: 'Raum Neu', rasterCm: 25 }), { params: Promise.resolve({ id: r.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Raum Neu');
    expect(data.rasterCm).toBe(25);
    expect(data.canvasDocument.rasterCm).toBe(25);
  });

  it('PATCH /api/raeume/[id] 401 unauth', async () => {
    await setSession(null);
    const res = await update(req('PATCH', { name: 'X' }), { params: Promise.resolve({ id: 'any' }) });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/raeume/[id] 403 other user', async () => {
    await setSession(mockUser);
    const r = await getDefaultRaumService().create('other', gueltig);
    const res = await update(req('PATCH', { name: 'X' }), { params: Promise.resolve({ id: r.id }) });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/raeume/[id] 404 not found', async () => {
    await setSession(mockUser);
    const res = await update(req('PATCH', { name: 'X' }), { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });

  it('PATCH /api/raeume/[id] 422 invalid input', async () => {
    await setSession(mockUser);
    const r = await getDefaultRaumService().create('u1', gueltig);
    const res = await update(req('PATCH', { rasterCm: 9999 }), { params: Promise.resolve({ id: r.id }) });
    expect(res.status).toBe(422);
  });

  it('DELETE /api/raeume/[id] 204 ok und danach nicht mehr listbar', async () => {
    await setSession(mockUser);
    const r = await getDefaultRaumService().create('u1', gueltig);
    const res = await remove(req('DELETE'), { params: Promise.resolve({ id: r.id }) });
    expect(res.status).toBe(204);

    const listRes = await getList(req('GET'));
    expect(await listRes.json()).toHaveLength(0);
  });

  it('DELETE /api/raeume/[id] 401 unauth', async () => {
    await setSession(null);
    const res = await remove(req('DELETE'), { params: Promise.resolve({ id: 'any' }) });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/raeume/[id] 403 other user', async () => {
    await setSession(mockUser);
    const r = await getDefaultRaumService().create('other', gueltig);
    const res = await remove(req('DELETE'), { params: Promise.resolve({ id: r.id }) });
    expect(res.status).toBe(403);
  });

  it('DELETE /api/raeume/[id] 404 not found', async () => {
    await setSession(mockUser);
    const res = await remove(req('DELETE'), { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });
});
