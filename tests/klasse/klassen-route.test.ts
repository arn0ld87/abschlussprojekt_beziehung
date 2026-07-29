import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getList, POST as create } from '../../app/api/klassen/route';
import { GET as getDetail, PATCH as update, DELETE as remove } from '../../app/api/klassen/[id]/route';
import { setGlobalKlassenService, getDefaultKlassenService } from '../../src/services/klasse';
import { setGlobalAuthService } from '../../src/services/auth';
import { AuthService } from '../../src/services/auth/auth-service';
import { InMemoryAuthRepository } from '../../src/infrastructure/auth/in-memory-repository';
import { KlassenService } from '../../src/domain/klasse';
import { InMemoryKlassenRepository } from '../../src/infrastructure/db/in-memory-klassen-repository';
import { User } from '../../src/domain/auth';

describe('Klassen Routes', () => {
  let klassenRepo: InMemoryKlassenRepository;
  let authRepo: InMemoryAuthRepository;
  let currentSessionToken = '';

  beforeEach(async () => {
    currentSessionToken = '';
    klassenRepo = new InMemoryKlassenRepository();
    const klassenService = new KlassenService(klassenRepo);
    setGlobalKlassenService(klassenService);

    authRepo = new InMemoryAuthRepository();
    const authService = new AuthService(authRepo);
    setGlobalAuthService(authService);
  });

  const mockUser: User = { id: 'u1', email: 'test@test.com', createdAt: new Date(), updatedAt: new Date() };

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
    return new NextRequest('http://localhost/api/klassen', {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it('GET /api/klassen 401 unauth', async () => {
    await setSession(null);
    const res = await getList(req('GET'));
    expect(res.status).toBe(401);
  });

  it('GET /api/klassen 200 ok', async () => {
    await setSession(mockUser);
    await getDefaultKlassenService().create('u1', { name: 'K1' });
    const res = await getList(req('GET'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('K1');
  });

  it('POST /api/klassen 401 unauth', async () => {
    await setSession(null);
    const res = await create(req('POST', { name: 'K2' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/klassen 201 created', async () => {
    await setSession(mockUser);
    const res = await create(req('POST', { name: 'K2', notizen: 'Test' }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('K2');
  });

  it('POST /api/klassen 422 empty name', async () => {
    await setSession(mockUser);
    const res = await create(req('POST', { name: '' }));
    expect(res.status).toBe(422);
  });

  it('GET /api/klassen/[id] 200 ok', async () => {
    await setSession(mockUser);
    const k = await getDefaultKlassenService().create('u1', { name: 'K3' });
    const res = await getDetail(req('GET'), { params: Promise.resolve({ id: k.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('K3');
  });

  it('GET /api/klassen/[id] 404 not found', async () => {
    await setSession(mockUser);
    const res = await getDetail(req('GET'), { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });

  it('GET /api/klassen/[id] 403 other user', async () => {
    await setSession(mockUser);
    const k = await getDefaultKlassenService().create('other', { name: 'K4' });
    const res = await getDetail(req('GET'), { params: Promise.resolve({ id: k.id }) });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/klassen/[id] 200 ok', async () => {
    await setSession(mockUser);
    const k = await getDefaultKlassenService().create('u1', { name: 'K' });
    const res = await update(req('PATCH', { name: 'K Neu' }), { params: Promise.resolve({ id: k.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('K Neu');
  });

  it('PATCH /api/klassen/[id] 401 unauth', async () => {
    await setSession(null);
    const res = await update(req('PATCH', { name: 'K Neu' }), { params: Promise.resolve({ id: 'any' }) });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/klassen/[id] 403 other user', async () => {
    await setSession(mockUser);
    const k = await getDefaultKlassenService().create('other', { name: 'K' });
    const res = await update(req('PATCH', { name: 'K Neu' }), { params: Promise.resolve({ id: k.id }) });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/klassen/[id] 404 not found', async () => {
    await setSession(mockUser);
    const res = await update(req('PATCH', { name: 'K Neu' }), { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });

  it('PATCH /api/klassen/[id] 422 invalid input', async () => {
    await setSession(mockUser);
    const k = await getDefaultKlassenService().create('u1', { name: 'K' });
    const res = await update(req('PATCH', { name: '' }), { params: Promise.resolve({ id: k.id }) });
    expect(res.status).toBe(422);
  });

  it('DELETE /api/klassen/[id] 204 ok', async () => {
    await setSession(mockUser);
    const k = await getDefaultKlassenService().create('u1', { name: 'K' });
    const res = await remove(req('DELETE'), { params: Promise.resolve({ id: k.id }) });
    expect(res.status).toBe(204);
  });

  it('DELETE /api/klassen/[id] 401 unauth', async () => {
    await setSession(null);
    const res = await remove(req('DELETE'), { params: Promise.resolve({ id: 'any' }) });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/klassen/[id] 403 other user', async () => {
    await setSession(mockUser);
    const k = await getDefaultKlassenService().create('other', { name: 'K' });
    const res = await remove(req('DELETE'), { params: Promise.resolve({ id: k.id }) });
    expect(res.status).toBe(403);
  });

  it('DELETE /api/klassen/[id] 404 not found', async () => {
    await setSession(mockUser);
    const res = await remove(req('DELETE'), { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });
});
