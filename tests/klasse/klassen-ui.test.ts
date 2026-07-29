import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import KlassenPage from '../../app/(app)/klassen/page';
import KlasseDetailPage from '../../app/(app)/klassen/[id]/page';
import { setGlobalKlassenService } from '../../src/services/klasse';
import { setGlobalAuthService } from '../../src/services/auth';
import { AuthService } from '../../src/services/auth/auth-service';
import { InMemoryAuthRepository } from '../../src/infrastructure/auth/in-memory-repository';
import { KlassenService } from '../../src/domain/klasse';
import { InMemoryKlassenRepository } from '../../src/infrastructure/db/in-memory-klassen-repository';
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

describe('Klassen UI Server Components', () => {
  let klassenRepo: InMemoryKlassenRepository;
  let authRepo: InMemoryAuthRepository;

  beforeEach(async () => {
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
      process.env.TEST_SESSION_TOKEN = session.id;
    } else {
      process.env.TEST_SESSION_TOKEN = '';
    }
  }

  it('renders KlassenPage with class list and name K1 when authenticated', async () => {
    await setSession(mockUser);
    await klassenRepo.create({ id: 'k1', name: 'K1', notizen: 'Test-Notiz', userId: 'u1' });

    const page = await KlassenPage();
    expect(page).toBeDefined();

    const str = JSON.stringify(page);
    expect(str).toContain('K1');
    expect(str).toContain('/klassen/k1');
  });

  it('redirects KlassenPage when unauthenticated', async () => {
    await setSession(null);
    let error;
    try {
      await KlassenPage();
    } catch (e: unknown) {
      error = e;
    }
    expect((error as Error).message).toBe('NEXT_REDIRECT');
  });

  it('renders KlasseDetailPage for owner with name, notes and edit navigation', async () => {
    await setSession(mockUser);
    const k = await klassenRepo.create({ id: 'k1', name: 'K1', notizen: 'Besondere Notizen', userId: 'u1' });

    const page = await KlasseDetailPage({ params: Promise.resolve({ id: k.id }) });
    expect(page).toBeDefined();

    const str = JSON.stringify(page);
    expect(str).toContain('K1');
    expect(str).toContain('Besondere Notizen');
    expect(str).toContain('/klassen/k1/edit');
  });

  it('renders fallback error view when KlasseDetailPage encounters non-existing class', async () => {
    await setSession(mockUser);

    const page = await KlasseDetailPage({ params: Promise.resolve({ id: 'missing' }) });
    expect(page).toBeDefined();

    const str = JSON.stringify(page);
    expect(str).toContain('Klasse nicht gefunden oder keine Berechtigung.');
    expect(str).toContain('/klassen');
  });
});
