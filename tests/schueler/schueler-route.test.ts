import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getSchuelerList, POST as createSchueler } from '../../app/api/klassen/[id]/schueler/route';
import { GET as getSchuelerDetail, PATCH as updateSchueler, DELETE as removeSchueler } from '../../app/api/klassen/[id]/schueler/[sid]/route';
import { POST as createSitzregel } from '../../app/api/klassen/[id]/schueler/[sid]/sitzregeln/route';
import { PATCH as updateSitzregel, DELETE as removeSitzregel } from '../../app/api/klassen/[id]/schueler/[sid]/sitzregeln/[rid]/route';

import { setGlobalKlassenService } from '../../src/services/klasse';
import { setGlobalSchuelerService } from '../../src/services/schueler';
import { setGlobalSitzregelService } from '../../src/services/sitzregel';
import { setGlobalAuthService } from '../../src/services/auth';

import { KlassenService } from '../../src/domain/klasse';
import { SchuelerService } from '../../src/domain/schueler';
import { SitzregelService } from '../../src/domain/sitzregel';
import { AuthService } from '../../src/services/auth/auth-service';

import { InMemoryKlassenRepository } from '../../src/infrastructure/db/in-memory-klassen-repository';
import { InMemorySchuelerRepository } from '../../src/infrastructure/db/in-memory-schueler-repository';
import { InMemorySitzregelRepository } from '../../src/infrastructure/db/in-memory-sitzregel-repository';
import { InMemoryAuthRepository } from '../../src/infrastructure/auth/in-memory-repository';
import { User } from '../../src/domain/auth';

describe('Schueler & Sitzregel Routes', () => {
  let klassenRepo: InMemoryKlassenRepository;
  let klassenService: KlassenService;
  let schuelerRepo: InMemorySchuelerRepository;
  let schuelerService: SchuelerService;
  let sitzregelRepo: InMemorySitzregelRepository;
  let sitzregelService: SitzregelService;
  let authRepo: InMemoryAuthRepository;

  let currentSessionToken = '';
  const mockUser: User = { id: 'u1', email: 'teacher@test.com', createdAt: new Date(), updatedAt: new Date() };

  beforeEach(() => {
    currentSessionToken = '';
    klassenRepo = new InMemoryKlassenRepository();
    klassenService = new KlassenService(klassenRepo);
    setGlobalKlassenService(klassenService);

    schuelerRepo = new InMemorySchuelerRepository();
    schuelerService = new SchuelerService(schuelerRepo, klassenService);
    setGlobalSchuelerService(schuelerService);

    sitzregelRepo = new InMemorySitzregelRepository();
    sitzregelService = new SitzregelService(sitzregelRepo, schuelerService, klassenService);
    setGlobalSitzregelService(sitzregelService);

    authRepo = new InMemoryAuthRepository();
    const authService = new AuthService(authRepo);
    setGlobalAuthService(authService);
  });

  async function setSession(user: User | null) {
    if (user) {
      await authRepo.createUser({ id: user.id, email: user.email, passwordHash: 'hash' });
      const session = await authRepo.createSession({ id: 'sess_1', userId: user.id, expiresAt: new Date(Date.now() + 100000) });
      currentSessionToken = session.id;
    } else {
      currentSessionToken = '';
    }
  }

  function req(method: string, path: string, body?: unknown) {
    const headers = new Headers();
    if (currentSessionToken) {
      headers.set('Cookie', `sitzplan_session=${currentSessionToken}`);
    }
    return new NextRequest(`http://localhost${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it('GET /api/klassen/[id]/schueler 401 unauth', async () => {
    await setSession(null);
    const res = await getSchuelerList(req('GET', '/api/klassen/k1/schueler'), { params: Promise.resolve({ id: 'k1' }) });
    expect(res.status).toBe(401);
  });

  it('POST /api/klassen/[id]/schueler 201 created', async () => {
    await setSession(mockUser);
    const k = await klassenService.create('u1', { name: 'K1' });

    const res = await createSchueler(
      req('POST', `/api/klassen/${k.id}/schueler`, { name: 'Max Mustermann', initialen: 'MM', farbe: '#123456' }),
      { params: Promise.resolve({ id: k.id }) }
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('Max Mustermann');
  });

  it('GET /api/klassen/[id]/schueler/[sid] 200 ok', async () => {
    await setSession(mockUser);
    const k = await klassenService.create('u1', { name: 'K1' });
    const s = await schuelerService.create('u1', k.id, { name: 'Max' });

    const res = await getSchuelerDetail(
      req('GET', `/api/klassen/${k.id}/schueler/${s.id}`),
      { params: Promise.resolve({ id: k.id, sid: s.id }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Max');
    expect(data.sitzregeln).toEqual([]);
  });

  it('POST /api/klassen/[id]/schueler/[sid]/sitzregeln 201 created', async () => {
    await setSession(mockUser);
    const k = await klassenService.create('u1', { name: 'K1' });
    const s = await schuelerService.create('u1', k.id, { name: 'Max' });

    const res = await createSitzregel(
      req('POST', `/api/klassen/${k.id}/schueler/${s.id}/sitzregeln`, { typ: 'front_seat', haerte: 'hard' }),
      { params: Promise.resolve({ id: k.id, sid: s.id }) }
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.typ).toBe('front_seat');
  });

  it('PATCH /api/klassen/[id]/schueler/[sid] 200 ok', async () => {
    await setSession(mockUser);
    const k = await klassenService.create('u1', { name: 'K1' });
    const s = await schuelerService.create('u1', k.id, { name: 'Max' });

    const res = await updateSchueler(
      req('PATCH', `/api/klassen/${k.id}/schueler/${s.id}`, { name: 'Max Neu' }),
      { params: Promise.resolve({ id: k.id, sid: s.id }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Max Neu');
  });

  it('DELETE /api/klassen/[id]/schueler/[sid] 204 deleted', async () => {
    await setSession(mockUser);
    const k = await klassenService.create('u1', { name: 'K1' });
    const s = await schuelerService.create('u1', k.id, { name: 'Max' });

    const res = await removeSchueler(
      req('DELETE', `/api/klassen/${k.id}/schueler/${s.id}`),
      { params: Promise.resolve({ id: k.id, sid: s.id }) }
    );
    expect(res.status).toBe(204);
  });

  it('PATCH /api/klassen/[id]/schueler/[sid]/sitzregeln/[rid] 200 ok', async () => {
    await setSession(mockUser);
    const k = await klassenService.create('u1', { name: 'K1' });
    const s = await schuelerService.create('u1', k.id, { name: 'Max' });
    const r = await sitzregelService.create('u1', k.id, s.id, { typ: 'front_seat', haerte: 'hard' });

    const res = await updateSitzregel(
      req('PATCH', `/api/klassen/${k.id}/schueler/${s.id}/sitzregeln/${r.id}`, { haerte: 'weighted', gewicht: 0.7 }),
      { params: Promise.resolve({ id: k.id, sid: s.id, rid: r.id }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.haerte).toBe('weighted');
    expect(data.gewicht).toBe(0.7);
  });

  it('DELETE /api/klassen/[id]/schueler/[sid]/sitzregeln/[rid] 204 deleted', async () => {
    await setSession(mockUser);
    const k = await klassenService.create('u1', { name: 'K1' });
    const s = await schuelerService.create('u1', k.id, { name: 'Max' });
    const r = await sitzregelService.create('u1', k.id, s.id, { typ: 'front_seat', haerte: 'hard' });

    const res = await removeSitzregel(
      req('DELETE', `/api/klassen/${k.id}/schueler/${s.id}/sitzregeln/${r.id}`),
      { params: Promise.resolve({ id: k.id, sid: s.id, rid: r.id }) }
    );
    expect(res.status).toBe(204);
  });
});
