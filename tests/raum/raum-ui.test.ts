import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import RaeumePage from '../../app/(app)/raeume/page';
import RaumDetailPage from '../../app/(app)/raeume/[id]/page';
import { setGlobalRaumService } from '../../src/services/raum';
import { setGlobalAuthService } from '../../src/services/auth';
import { AuthService } from '../../src/services/auth/auth-service';
import { InMemoryAuthRepository } from '../../src/infrastructure/auth/in-memory-repository';
import { RaumService } from '../../src/domain/raum';
import { InMemoryRaumRepository } from '../../src/infrastructure/db/in-memory-raum-repository';
import { User } from '../../src/domain/auth';

// Mock UI components for testing environment
vi.mock('../../src/ui/Button', () => ({ default: ({ children }: { children?: React.ReactNode }) => React.createElement('button', null, children) }));
vi.mock('../../src/ui/Container', () => ({ default: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => React.createElement('a', { href }, children) }));

// Next headers mock for session
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => {
      if (name === 'sitzplan_session' && process.env.TEST_SESSION_TOKEN) {
        return { value: process.env.TEST_SESSION_TOKEN };
      }
      return null;
    }
  })
}));

describe('Raeume UI Server Components', () => {
  let raumRepo: InMemoryRaumRepository;
  let authRepo: InMemoryAuthRepository;
  let raumService: RaumService;

  beforeEach(async () => {
    raumRepo = new InMemoryRaumRepository();
    raumService = new RaumService(raumRepo);
    setGlobalRaumService(raumService);

    authRepo = new InMemoryAuthRepository();
    const authService = new AuthService(authRepo);
    setGlobalAuthService(authService);
  });

  const mockUser: User = { id: 'u1', email: 'test@test.com', createdAt: new Date(), updatedAt: new Date() };
  const gueltig = { name: 'Klassenraum', breiteCm: 800, laengeCm: 600, rasterCm: 50 };

  async function setSession(user: User | null) {
    if (user) {
      await authRepo.createUser({ id: user.id, email: user.email, passwordHash: 'hash' });
      const session = await authRepo.createSession({ id: 's1', userId: user.id, expiresAt: new Date(Date.now() + 100000) });
      process.env.TEST_SESSION_TOKEN = session.id;
    } else {
      process.env.TEST_SESSION_TOKEN = '';
    }
  }

  it('renders RaeumePage with raum list, maße and detail link when authenticated', async () => {
    await setSession(mockUser);
    const r = await raumService.create('u1', gueltig);

    const page = await RaeumePage();
    expect(page).toBeDefined();

    const str = JSON.stringify(page);
    expect(str).toContain('Klassenraum');
    expect(str).toContain(`/raeume/${r.id}`);
    expect(str).toContain('800');
    expect(str).toContain('/raeume/neu');
  });

  it('renders empty state when no raeume exist', async () => {
    await setSession(mockUser);

    const page = await RaeumePage();
    const str = JSON.stringify(page);
    expect(str).toContain('Noch keine Raumvorlagen angelegt.');
  });

  it('redirects RaeumePage when unauthenticated', async () => {
    await setSession(null);
    let error;
    try {
      await RaeumePage();
    } catch (e: unknown) {
      error = e;
    }
    expect((error as Error).message).toBe('NEXT_REDIRECT');
  });

  it('renders RaumDetailPage editor shell with raum data for owner', async () => {
    await setSession(mockUser);
    const r = await raumService.create('u1', gueltig);

    const page = await RaumDetailPage({ params: Promise.resolve({ id: r.id }) });
    expect(page).toBeDefined();

    const str = JSON.stringify(page);
    expect(str).toContain('Klassenraum');
    expect(str).toContain('Dokumentversion');
  });

  it('renders fallback error view when RaumDetailPage encounters non-existing raum', async () => {
    await setSession(mockUser);

    const page = await RaumDetailPage({ params: Promise.resolve({ id: 'missing' }) });
    expect(page).toBeDefined();

    const str = JSON.stringify(page);
    expect(str).toContain('Raum nicht gefunden oder keine Berechtigung.');
    expect(str).toContain('/raeume');
  });
});
