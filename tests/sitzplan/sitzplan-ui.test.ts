import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { KlassenService } from '../../src/domain/klasse';
import { RaumService } from '../../src/domain/raum';
import { SitzplanService } from '../../src/domain/sitzplan';
import { InMemoryKlassenRepository } from '../../src/infrastructure/db/in-memory-klassen-repository';
import { InMemoryRaumRepository } from '../../src/infrastructure/db/in-memory-raum-repository';
import { InMemorySitzplanRepository } from '../../src/infrastructure/db/in-memory-sitzplan-repository';
import { setGlobalKlassenService } from '../../src/services/klasse';
import { setGlobalRaumService } from '../../src/services/raum';
import { setGlobalSitzplanService } from '../../src/services/sitzplan';
import { setGlobalAuthService } from '../../src/services/auth';
import { AuthService } from '../../src/services/auth/auth-service';
import { InMemoryAuthRepository } from '../../src/infrastructure/auth/in-memory-repository';
import { User } from '../../src/domain/auth';

// UI-Smoke für den Sitzplan-Slice (M3 #56): Server-Komponenten werden real
// gerendert; die interaktiven Client-Formulare (Anlegen, Umbenennen,
// Löschen) werden über ihr statisches Initial-Markup und ihren Quell-Vertrag
// geprüft — im node-Testkontext steht kein DOM für Effekte zur Verfügung.

vi.mock('../../src/ui/Button', () => ({
  default: ({ children, type, disabled }: { children?: React.ReactNode; type?: string; disabled?: boolean }) =>
    React.createElement('button', { type: type ?? 'button', disabled: disabled ?? false }, children),
}));
vi.mock('../../src/ui/Container', () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));
vi.mock('next/navigation', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return { ...original, useRouter: () => ({ push: () => {}, refresh: () => {} }) };
});
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => {
      if (name === 'sitzplan_session' && process.env.TEST_SESSION_TOKEN) {
        return { value: process.env.TEST_SESSION_TOKEN };
      }
      return null;
    },
  }),
}));

import SitzplaenePage from '../../app/(app)/sitzplaene/page';
import SitzplanDetailPage from '../../app/(app)/sitzplaene/[id]/page';
import NeuerSitzplanPage from '../../app/(app)/sitzplaene/neu/page';

describe('Sitzplan UI (M3 #56)', () => {
  let authRepo: InMemoryAuthRepository;
  let klassenService: KlassenService;
  let raumService: RaumService;
  let sitzplanService: SitzplanService;

  beforeEach(() => {
    klassenService = new KlassenService(new InMemoryKlassenRepository());
    raumService = new RaumService(new InMemoryRaumRepository());
    sitzplanService = new SitzplanService(new InMemorySitzplanRepository(), klassenService, raumService);
    setGlobalKlassenService(klassenService);
    setGlobalRaumService(raumService);
    setGlobalSitzplanService(sitzplanService);

    authRepo = new InMemoryAuthRepository();
    setGlobalAuthService(new AuthService(authRepo));
  });

  const mockUser: User = { id: 'u1', email: 'test@test.com', createdAt: new Date(), updatedAt: new Date() };

  async function setSession(user: User | null) {
    if (user) {
      await authRepo.createUser({ id: user.id, email: user.email, passwordHash: 'hash' });
      const session = await authRepo.createSession({
        id: 's1',
        userId: user.id,
        expiresAt: new Date(Date.now() + 100000),
      });
      process.env.TEST_SESSION_TOKEN = session.id;
    } else {
      process.env.TEST_SESSION_TOKEN = '';
    }
  }

  async function anlegen(userId = 'u1', name = 'Fantasieplan 8a') {
    const klasse = await klassenService.create(userId, { name: 'Fantasieklasse 8a' });
    const raum = await raumService.create(userId, {
      name: 'Fantasieraum Nord',
      breiteCm: 800,
      laengeCm: 600,
      rasterCm: 50,
    });
    await raumService.addObjekt(userId, raum.id, { typ: 'table_double' });
    const sitzplan = await sitzplanService.create(userId, { name, klasseId: klasse.id, raumId: raum.id });
    return { klasse, raum, sitzplan };
  }

  describe('/sitzplaene (Liste)', () => {
    it('zeigt eigene Pläne mit Detail-Link und Anlegen-Einstieg', async () => {
      await setSession(mockUser);
      const { sitzplan } = await anlegen();

      const str = JSON.stringify(await SitzplaenePage());
      expect(str).toContain('Fantasieplan 8a');
      expect(str).toContain(`/sitzplaene/${sitzplan.id}`);
      expect(str).toContain('/sitzplaene/neu');
    });

    it('zeigt einen leeren Zustand ohne Pläne', async () => {
      await setSession(mockUser);
      const str = JSON.stringify(await SitzplaenePage());
      expect(str).toContain('Noch keine Sitzpläne angelegt.');
    });

    it('leitet ohne Anmeldung auf /signin um', async () => {
      await setSession(null);
      const err = await SitzplaenePage().catch((e: unknown) => e);
      expect((err as Error).message).toBe('NEXT_REDIRECT');
    });

    it('listet soft-gelöschte Pläne nicht mehr', async () => {
      await setSession(mockUser);
      const { sitzplan } = await anlegen();
      await sitzplanService.delete('u1', sitzplan.id);

      const str = JSON.stringify(await SitzplaenePage());
      expect(str).not.toContain('Fantasieplan 8a');
      expect(str).toContain('Noch keine Sitzpläne angelegt.');
    });
  });

  describe('/sitzplaene/[id] (Editor-Shell)', () => {
    it('zeigt Name, Quellklasse, Quellvorlage und eingefrorene Maße', async () => {
      await setSession(mockUser);
      const { sitzplan } = await anlegen();

      const str = JSON.stringify(await SitzplanDetailPage({ params: Promise.resolve({ id: sitzplan.id }) }));
      expect(str).toContain('Fantasieplan 8a');
      expect(str).toContain('Fantasieklasse 8a');
      expect(str).toContain('Fantasieraum Nord');
      expect(str).toContain('800 × 600 cm · Raster 50 cm');
      expect(str).toContain('/sitzplaene');
    });

    it('zeigt die eingefrorene Geometrie auch nach Änderung der Raumvorlage', async () => {
      await setSession(mockUser);
      const { raum, sitzplan } = await anlegen();
      await raumService.update('u1', raum.id, { breiteCm: 1200, name: 'Umbenannter Raum' });

      const str = JSON.stringify(await SitzplanDetailPage({ params: Promise.resolve({ id: sitzplan.id }) }));
      expect(str).toContain('800 × 600 cm · Raster 50 cm');
      expect(str).not.toContain('1200 × 600 cm');
    });

    it('zeigt einen Fallback für unbekannte und fremde Pläne', async () => {
      await setSession(mockUser);
      const unbekannt = JSON.stringify(
        await SitzplanDetailPage({ params: Promise.resolve({ id: 'plan_missing' }) }),
      );
      expect(unbekannt).toContain('Sitzplan nicht gefunden oder keine Berechtigung.');

      const { sitzplan } = await anlegen('other', 'Fremder Plan');
      const fremd = JSON.stringify(await SitzplanDetailPage({ params: Promise.resolve({ id: sitzplan.id }) }));
      expect(fremd).toContain('Sitzplan nicht gefunden oder keine Berechtigung.');
    });
  });

  describe('/sitzplaene/neu (Anlegen)', () => {
    it('rendert benannte Felder für Name, Klasse und Raumvorlage', () => {
      const html = renderToStaticMarkup(React.createElement(NeuerSitzplanPage));
      for (const feld of ['name', 'klasseId', 'raumId']) {
        expect(html).toContain(`for="${feld}"`);
        expect(html).toContain(`id="${feld}"`);
      }
      expect(html).toContain('<select');
      expect(html).toContain('Klasse');
      expect(html).toContain('Raumvorlage');
    });
  });

  describe('Quell-Vertrag der Client-Formulare', () => {
    const neu = readFileSync(resolve(process.cwd(), 'app/(app)/sitzplaene/neu/page.tsx'), 'utf8');
    const verwaltung = readFileSync(
      resolve(process.cwd(), 'app/(app)/sitzplaene/[id]/_components/SitzplanVerwaltung.tsx'),
      'utf8',
    );

    it('lädt die Auswahllisten aus den eigenen Klassen- und Raum-Endpunkten', () => {
      expect(neu).toContain("fetch('/api/klassen')");
      expect(neu).toContain("fetch('/api/raeume')");
    });

    it('legt den Plan per POST an und öffnet ihn danach', () => {
      expect(neu).toContain("fetch('/api/sitzplaene'");
      expect(neu).toContain("method: 'POST'");
      expect(neu).toContain('router.push(`/sitzplaene/${');
    });

    it('benennt per PATCH um und löscht per DELETE mit Bestätigung', () => {
      expect(verwaltung).toContain('fetch(`/api/sitzplaene/${id}`');
      expect(verwaltung).toContain("method: 'PATCH'");
      expect(verwaltung).toContain("method: 'DELETE'");
      expect(verwaltung).toContain('confirm(');
      expect(verwaltung).toContain("router.push('/sitzplaene')");
    });
  });
});
