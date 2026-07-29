import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as preview } from '../../app/api/klassen/[id]/import/preview/route';
import { POST as commit } from '../../app/api/klassen/[id]/import/commit/route';
import { setGlobalKlassenService } from '../../src/services/klasse';
import { setGlobalSchuelerService } from '../../src/services/schueler';
import { setGlobalSitzregelService } from '../../src/services/sitzregel';
import { setGlobalCsvImportService } from '../../src/services/csv-import';
import { setGlobalAuthService } from '../../src/services/auth';
import { AuthService } from '../../src/services/auth/auth-service';
import { InMemoryAuthRepository } from '../../src/infrastructure/auth/in-memory-repository';
import { KlassenService } from '../../src/domain/klasse';
import { InMemoryKlassenRepository } from '../../src/infrastructure/db/in-memory-klassen-repository';
import { SchuelerService } from '../../src/domain/schueler';
import { InMemorySchuelerRepository } from '../../src/infrastructure/db/in-memory-schueler-repository';
import { SitzregelService } from '../../src/domain/sitzregel';
import { InMemorySitzregelRepository } from '../../src/infrastructure/db/in-memory-sitzregel-repository';
import { CsvImportService } from '../../src/domain/csv-import';
import { User } from '../../src/domain/auth';

describe('CSV Import Routes', () => {
  let authRepo: InMemoryAuthRepository;
  let currentSessionToken = '';
  let klassenService: KlassenService;

  beforeEach(async () => {
    currentSessionToken = '';
    
    klassenService = new KlassenService(new InMemoryKlassenRepository());
    setGlobalKlassenService(klassenService);
    
    const schuelerService = new SchuelerService(new InMemorySchuelerRepository(), klassenService);
    setGlobalSchuelerService(schuelerService);
    
    const sitzregelService = new SitzregelService(new InMemorySitzregelRepository(), schuelerService, klassenService);
    setGlobalSitzregelService(sitzregelService);
    
    const csvImportService = new CsvImportService(schuelerService, sitzregelService);
    setGlobalCsvImportService(csvImportService);

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
    return new NextRequest('http://localhost/api/klassen/kl1/import/preview', {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it('POST /preview 200 ok', async () => {
    await setSession(mockUser);
    const k = await klassenService.create('u1', { name: 'K1' });
    const res = await preview(req('POST', { csvText: 'Name\nJohn' }), { params: Promise.resolve({ id: k.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalRows).toBe(1);
  });

  it('POST /commit 200 ok', async () => {
    await setSession(mockUser);
    const k = await klassenService.create('u1', { name: 'K1' });
    const res = await commit(req('POST', { csvText: 'Name\nJohn', strategy: 'skip' }), { params: Promise.resolve({ id: k.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.successCount).toBe(1);
  });
});
