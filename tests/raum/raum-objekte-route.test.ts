import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as addObjekt } from '../../app/api/raeume/[id]/objekte/route';
import { PATCH as bewegeObjekt, DELETE as entferneObjekt } from '../../app/api/raeume/[id]/objekte/[objektId]/route';
import { POST as objektAktion } from '../../app/api/raeume/[id]/objekte/[objektId]/aktionen/route';
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

  // --- M2 #53: Objektaktionen ---

  function aktionReq(body?: unknown) {
    const headers = new Headers();
    if (currentSessionToken) {
      headers.set('Cookie', `sitzplan_session=${currentSessionToken}`);
    }
    return new NextRequest('http://localhost/api/raeume/x/objekte/y/aktionen', {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  function deleteReq() {
    const headers = new Headers();
    if (currentSessionToken) {
      headers.set('Cookie', `sitzplan_session=${currentSessionToken}`);
    }
    return new NextRequest('http://localhost/api/raeume/x/objekte/y', { method: 'DELETE', headers });
  }

  it('POST aktionen 200 rotieren persistiert die 90°-Drehung', async () => {
    await setSession(mockUser);
    const service = getDefaultRaumService();
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const objektId = mit.canvasDocument.objekte[0].id;

    const res = await objektAktion(aktionReq({ aktion: 'rotieren' }), {
      params: Promise.resolve({ id: r.id, objektId }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.canvasDocument.objekte[0].rotation_deg).toBe(90);
  });

  it('POST aktionen 200 duplizieren erzeugt eine neue Objekt-ID', async () => {
    await setSession(mockUser);
    const service = getDefaultRaumService();
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const objektId = mit.canvasDocument.objekte[0].id;

    const res = await objektAktion(aktionReq({ aktion: 'duplizieren' }), {
      params: Promise.resolve({ id: r.id, objektId }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.canvasDocument.objekte).toHaveLength(2);
    const ids = data.canvasDocument.objekte.map((o: { id: string }) => o.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('POST aktionen 401/403/404/422', async () => {
    const service = getDefaultRaumService();
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const objektId = mit.canvasDocument.objekte[0].id;

    // 401
    await setSession(null);
    expect(
      (await objektAktion(aktionReq({ aktion: 'rotieren' }), { params: Promise.resolve({ id: r.id, objektId }) })).status,
    ).toBe(401);

    await setSession(mockUser);
    // 403 — Raum eines anderen Nutzers
    const fremd = await service.create('other', gueltig);
    const fremdMit = await service.addObjekt('other', fremd.id, { typ: 'board' });
    expect(
      (
        await objektAktion(aktionReq({ aktion: 'rotieren' }), {
          params: Promise.resolve({ id: fremd.id, objektId: fremdMit.canvasDocument.objekte[0].id }),
        })
      ).status,
    ).toBe(403);

    // 404 — unbekanntes Objekt
    expect(
      (
        await objektAktion(aktionReq({ aktion: 'rotieren' }), {
          params: Promise.resolve({ id: r.id, objektId: 'obj_unbekannt' }),
        })
      ).status,
    ).toBe(404);

    // 422 — unbekannte Aktion mit stabilem Fehlercode
    const res = await objektAktion(aktionReq({ aktion: 'explodieren' }), {
      params: Promise.resolve({ id: r.id, objektId }),
    });
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe('VALIDATION_ERROR');
  });

  it('DELETE 204 entfernt das Objekt', async () => {
    await setSession(mockUser);
    const service = getDefaultRaumService();
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'door' });
    const objektId = mit.canvasDocument.objekte[0].id;

    const res = await entferneObjekt(deleteReq(), { params: Promise.resolve({ id: r.id, objektId }) });
    expect(res.status).toBe(204);
    expect((await service.getById('u1', r.id)).canvasDocument.objekte).toHaveLength(0);
  });

  it('DELETE 401/403/404', async () => {
    const service = getDefaultRaumService();
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'door' });
    const objektId = mit.canvasDocument.objekte[0].id;

    await setSession(null);
    expect((await entferneObjekt(deleteReq(), { params: Promise.resolve({ id: r.id, objektId }) })).status).toBe(401);

    await setSession(mockUser);
    const fremd = await service.create('other', gueltig);
    const fremdMit = await service.addObjekt('other', fremd.id, { typ: 'door' });
    expect(
      (
        await entferneObjekt(deleteReq(), {
          params: Promise.resolve({ id: fremd.id, objektId: fremdMit.canvasDocument.objekte[0].id }),
        })
      ).status,
    ).toBe(403);

    expect(
      (await entferneObjekt(deleteReq(), { params: Promise.resolve({ id: r.id, objektId: 'obj_unbekannt' }) })).status,
    ).toBe(404);
  });

  it('POST aktionen 409 bei verlorenem Compare-and-Swap (Service→Route-Kette)', async () => {
    await setSession(mockUser);
    const service = getDefaultRaumService();
    const r = await service.create('u1', gueltig);
    const mit = await service.addObjekt('u1', r.id, { typ: 'table_single' });
    const objektId = mit.canvasDocument.objekte[0].id;

    // Simuliert einen parallelen Write zwischen Lesen und Schreiben:
    // Das Repository lehnt das CAS-Update ab.
    const origUpdate = raumRepo.update.bind(raumRepo);
    raumRepo.update = (async (id: string, data: never, erwartet?: Date) =>
      erwartet ? null : origUpdate(id, data)) as typeof raumRepo.update;

    const res = await objektAktion(aktionReq({ aktion: 'rotieren' }), {
      params: Promise.resolve({ id: r.id, objektId }),
    });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.code).toBe('CONFLICT');

    // Kein scheinbar erfolgreicher Write: Stand unverändert
    raumRepo.update = origUpdate;
    expect((await service.getById('u1', r.id)).canvasDocument.objekte[0].rotation_deg).toBe(0);
  });
});
