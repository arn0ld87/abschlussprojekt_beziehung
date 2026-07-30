import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as addObjekt } from '../../app/api/raeume/[id]/objekte/route';
import { PATCH as bewegeObjekt } from '../../app/api/raeume/[id]/objekte/[objektId]/route';
import { setGlobalRaumService, getDefaultRaumService } from '../../src/services/raum';
import { setGlobalAuthService } from '../../src/services/auth';
import { AuthService } from '../../src/services/auth/auth-service';
import { InMemoryAuthRepository } from '../../src/infrastructure/auth/in-memory-repository';
import { RaumService } from '../../src/domain/raum';
import { InMemoryRaumRepository } from '../../src/infrastructure/db/in-memory-raum-repository';
import { User } from '../../src/domain/auth';

describe('POST /api/raeume/[id]/objekte (M2 #51)', () => {
  let raumRepo: InMemoryRaumRepository;
  let authRepo: InMemoryAuthRepository;
  let currentSessionToken = '';

  beforeEach(async () => {
    currentSessionToken = '';
    raumRepo = new InMemoryRaumRepository();
    setGlobalRaumService(new RaumService(raumRepo));

    authRepo = new InMemoryAuthRepository();
    setGlobalAuthService(new AuthService(authRepo));
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

  function req(body?: unknown) {
    const headers = new Headers();
    if (currentSessionToken) {
      headers.set('Cookie', `sitzplan_session=${currentSessionToken}`);
    }
    return new NextRequest('http://localhost/api/raeume/x/objekte', {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it('201 fügt ein Standardobjekt hinzu und liefert das aktualisierte Dokument', async () => {
    await setSession(mockUser);
    const r = await getDefaultRaumService().create('u1', gueltig);

    const res = await addObjekt(req({ typ: 'teacher_desk' }), { params: Promise.resolve({ id: r.id }) });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.canvasDocument.objekte).toHaveLength(1);
    expect(data.canvasDocument.objekte[0].typ).toBe('teacher_desk');
    expect(data.canvasDocument.objekte[0].id).toMatch(/^obj_/);
    // Persistiert in Zentimetern, nicht in Pixeln
    expect(data.canvasDocument.objekte[0].breite_cm).toBe(160);
    expect(data.canvasDocument.objekte[0].tiefe_cm).toBe(80);
  });

  it('401 unauth', async () => {
    await setSession(null);
    const res = await addObjekt(req({ typ: 'board' }), { params: Promise.resolve({ id: 'any' }) });
    expect(res.status).toBe(401);
  });

  it('403 other user', async () => {
    await setSession(mockUser);
    const r = await getDefaultRaumService().create('other', gueltig);
    const res = await addObjekt(req({ typ: 'board' }), { params: Promise.resolve({ id: r.id }) });
    expect(res.status).toBe(403);
  });

  it('404 not found', async () => {
    await setSession(mockUser);
    const res = await addObjekt(req({ typ: 'board' }), { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });

  it('422 unbekannte Objektart mit stabilem Fehlercode', async () => {
    await setSession(mockUser);
    const r = await getDefaultRaumService().create('u1', gueltig);
    const res = await addObjekt(req({ typ: 'spaceship' }), { params: Promise.resolve({ id: r.id }) });
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  // --- M2 #52: PATCH /api/raeume/[id]/objekte/[objektId] ---

  function patchReq(body?: unknown) {
    const headers = new Headers();
    if (currentSessionToken) {
      headers.set('Cookie', `sitzplan_session=${currentSessionToken}`);
    }
    return new NextRequest('http://localhost/api/raeume/x/objekte/y', {
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it('PATCH 200 speichert die gerundete Endposition', async () => {
    await setSession(mockUser);
    const service = getDefaultRaumService();
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const objektId = mit.canvasDocument.objekte[0].id;

    const res = await bewegeObjekt(patchReq({ x_cm: 137, y_cm: 249 }), {
      params: Promise.resolve({ id: r.id, objektId }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.canvasDocument.objekte[0].x_cm).toBe(150);
    expect(data.canvasDocument.objekte[0].y_cm).toBe(250);
  });

  it('PATCH 401 unauth', async () => {
    await setSession(null);
    const res = await bewegeObjekt(patchReq({ x_cm: 0, y_cm: 0 }), {
      params: Promise.resolve({ id: 'any', objektId: 'obj_x' }),
    });
    expect(res.status).toBe(401);
  });

  it('PATCH 403 other user', async () => {
    await setSession(mockUser);
    const service = getDefaultRaumService();
    const r = await service.create('other', gueltig);
    const mit = await service.addObjekt('other', r.id, { typ: 'board' });
    const res = await bewegeObjekt(patchReq({ x_cm: 0, y_cm: 0 }), {
      params: Promise.resolve({ id: r.id, objektId: mit.canvasDocument.objekte[0].id }),
    });
    expect(res.status).toBe(403);
  });

  it('PATCH 404 unbekannter Raum oder unbekanntes Objekt', async () => {
    await setSession(mockUser);
    const service = getDefaultRaumService();
    const r = await service.create('u1', gueltig);

    const raumFehlt = await bewegeObjekt(patchReq({ x_cm: 0, y_cm: 0 }), {
      params: Promise.resolve({ id: 'missing', objektId: 'obj_x' }),
    });
    expect(raumFehlt.status).toBe(404);

    const objektFehlt = await bewegeObjekt(patchReq({ x_cm: 0, y_cm: 0 }), {
      params: Promise.resolve({ id: r.id, objektId: 'obj_unbekannt' }),
    });
    expect(objektFehlt.status).toBe(404);
  });

  it('PATCH 422 ungültige Position', async () => {
    await setSession(mockUser);
    const service = getDefaultRaumService();
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'board' });
    const res = await bewegeObjekt(patchReq({ x_cm: 'links', y_cm: 0 }), {
      params: Promise.resolve({ id: r.id, objektId: mit.canvasDocument.objekte[0].id }),
    });
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.code).toBe('VALIDATION_ERROR');
  });
});
