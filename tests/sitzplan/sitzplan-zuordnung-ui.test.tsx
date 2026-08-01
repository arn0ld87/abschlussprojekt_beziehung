import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { erzeugeSitzplaetze } from '../../src/domain/raum/sitzplaetze';
import type { RaumObjektV1 } from '../../src/domain/raum/objekte';

/**
 * Bedien- und Accessibility-Vertrag der Schülerzuordnung (M3 #57).
 *
 * Drag-and-drop ist ohne DOM-Interaktion nicht renderbar; die alternative
 * zugängliche Bedienung über Auswahl und Aktion ist es sehr wohl. Genau
 * deshalb wird sie hier auf zwei Ebenen geprüft:
 * 1. statisches Markup: benannte Bedienelemente, Auswahlzustände, Listen-
 *    und Statusrollen, sichtbare Ablage;
 * 2. Quell-Vertrag für interaktionsabhängige Merkmale (Drag-and-drop,
 *    Tastaturbedienung, Schreibpfad, Rollback).
 *
 * Kein axe/jsdom in der node-Umgebung — geprüft werden die WCAG-relevanten
 * Kernmerkmale: benannte Bedienelemente (4.1.2), Tastaturbedienbarkeit
 * (2.1.1) und Statusmeldungen (4.1.3).
 */

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_loader: unknown, options?: { loading?: React.ComponentType }) => {
    const Fallback = options?.loading;
    return function DynamicStub() {
      return Fallback ? React.createElement(Fallback) : null;
    };
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}));

import SitzplanZuordnung from '../../app/(app)/sitzplaene/[id]/_components/SitzplanZuordnung';

const doppeltisch: RaumObjektV1 = {
  id: 'obj_t1',
  typ: 'table_double',
  x_cm: 100,
  y_cm: 100,
  breite_cm: 120,
  tiefe_cm: 60,
  rotation_deg: 0,
};

const sitzplaetze = erzeugeSitzplaetze(doppeltisch);

const props = {
  sitzplanId: 'plan_fantasie',
  geometrie: {
    breiteCm: 800,
    laengeCm: 600,
    rasterCm: 50,
    objekte: [doppeltisch],
    sitzplaetze,
  },
  schueler: [
    { id: 'sch_1', name: 'Anna Fantasie', initialen: 'AF', farbe: '#4F46E5' },
    { id: 'sch_2', name: 'Bruno Fantasie', initialen: 'BF', farbe: '#0D9488' },
  ],
  zuordnungen: [{ sitzplatzId: sitzplaetze[0].id, schuelerId: 'sch_1' }],
  befunde: [],
};

const quelle = readFileSync(
  resolve(process.cwd(), 'app/(app)/sitzplaene/[id]/_components/SitzplanZuordnung.tsx'),
  'utf8',
);

describe('Schülerzuordnung — Bedienvertrag (M3 #57)', () => {
  describe('statisches Markup', () => {
    const html = renderToStaticMarkup(React.createElement(SitzplanZuordnung, props));

    it('zeigt eine sichtbare, benannte Ablage mit den nicht platzierten Schülern', () => {
      expect(html).toContain('Ablage');
      expect(html).toContain('aria-label="Ablage: Schüler ohne Sitzplatz"');
      // Bruno sitzt nicht — er steht in der Ablage.
      expect(html).toContain('Bruno Fantasie');
    });

    it('zeigt belegte und freie Sitzplätze als benannte Bedienelemente', () => {
      expect(html).toContain('aria-label="Sitzplätze im Raum"');
      // Belegter Platz nennt den Schüler, freier Platz ist als frei benannt.
      expect(html).toContain('Anna Fantasie');
      expect(html).toMatch(/aria-label="[^"]*frei[^"]*"/i);
    });

    it('macht den Auswahlzustand für Assistenztechnologie sichtbar', () => {
      expect(html).toContain('aria-pressed="false"');
    });

    it('stellt eine Statusmeldung als Live-Region bereit', () => {
      expect(html).toContain('role="status"');
    });

    it('nennt die zugängliche Alternative zum Ziehen ausdrücklich', () => {
      expect(html).toMatch(/Auswählen/i);
      expect(html).toMatch(/Tastatur/i);
      // Die Einschränkung „Ablage nur auf freie Plätze" steht sichtbar dort,
      // wo sie gilt — nicht erst in der Ablehnungsmeldung.
      expect(html).toMatch(/nur auf\s*einen freien Platz/i);
    });

    it('zeigt Inkonsistenzbefunde höflich an, ohne die Bedienung zu blockieren', () => {
      const mitBefund = renderToStaticMarkup(
        React.createElement(SitzplanZuordnung, {
          ...props,
          befunde: [
            {
              code: 'SCHUELER_NICHT_AKTIV' as const,
              sitzplatzId: sitzplaetze[1].id,
              schuelerId: 'sch_weg',
              meldung: 'Der Sitzplatz verweist auf ein Schülerprofil, das nicht mehr aktiv ist.',
            },
          ],
        }),
      );
      // `role="status"` statt `role="alert"`: Die Befunde stehen bereits beim
      // Laden im Markup und sind keine dynamisch auftretende Warnung. Die
      // Listensemantik der Einträge bleibt dabei erhalten.
      expect(mitBefund).toContain('role="status"');
      expect(mitBefund).toContain('aria-label="Inkonsistenzen in diesem Sitzplan"');
      expect(mitBefund).not.toContain('<ul role="alert"');
      expect(mitBefund).toContain('nicht mehr aktiv');
      // Die Ablage bleibt bedienbar.
      expect(mitBefund).toContain('aria-label="Ablage: Schüler ohne Sitzplatz"');
    });
  });

  // Das *Verhalten* der Bedienung — welche Handlung was bewirkt, was abgelehnt
  // wird und was angesagt wird — ist vollständig in
  // `sitzplan-zuordnung-interaktion.test.ts` geprüft, weil die Entscheidungen
  // im framework-freien Modul `zuordnung-interaktion.ts` liegen und dort ohne
  // DOM ausführbar sind. Hier bleiben nur Aussagen über die Verdrahtung, die
  // ohne DOM nicht ausführbar wären; sie ergänzen die Verhaltenstests und
  // ersetzen sie nicht.
  describe('Verdrahtung der Komponente', () => {
    it('trifft keine eigenen Fachentscheidungen, sondern führt das Interaktionsmodul aus', () => {
      // Die Commands werden ausschließlich über das Interaktionsmodul erreicht —
      // eine zweite, abweichende Entscheidungslogik in der Komponente würde die
      // Verhaltenstests wirkungslos machen.
      expect(quelle).toContain("from './zuordnung-interaktion'");
      // Reiner Typ-Import aus dem Command-Modul ist zulässig, ein Wert-Import
      // nicht: Sonst könnte die Komponente die Commands an der geprüften
      // Entscheidungslogik vorbei aufrufen.
      expect(quelle).not.toMatch(/^import \{[^}]*\} from '[^']*zuordnung-commands'/m);
      expect(quelle).not.toMatch(/\bsetzeSchueler\(/);
      expect(quelle).not.toMatch(/\btausche\(/);
      expect(quelle).not.toMatch(/\bentferne\(/);
    });

    it('schreibt über den Zuordnungs-Endpunkt und nie direkt in die Datenbank', () => {
      expect(quelle).toContain('/zuordnungen`');
      expect(quelle).toContain("method: 'PUT'");
      expect(quelle).not.toContain('drizzle');
      expect(quelle).not.toContain('getDb');
    });

    it('setzt den letzten bestätigten Stand zurück, wenn das Speichern fehlschlägt', () => {
      // Seit M3 #58 trägt die Historie den Editorzustand; zurückgesetzt wird
      // deshalb der vollständige Historienwert, nicht nur die Zuordnungsliste.
      expect(quelle).toMatch(/setHistorie\(vorher\)/);
    });

    it('verliert den Tastaturfokus während des Speicherns nicht', () => {
      // `disabled` würde den Fokus des gerade betätigten Elements auf <body>
      // werfen (WCAG 2.4.3). Der Schutz vor Doppelaktionen liegt stattdessen im
      // Guard von `fuehreAus`.
      expect(quelle).not.toMatch(/(?<!aria-)disabled=\{speichert\}/);
      expect(quelle).toContain('aria-disabled={speichert}');
      expect(quelle).toMatch(/if \(speichert\) return;/);
    });

    it('verbindet Drag-and-drop mit denselben Entscheidungen wie die Tastaturbedienung', () => {
      expect(quelle).toContain('onDragStart');
      expect(quelle).toContain('onDragOver');
      expect(quelle).toContain('dropAufSitzplatz(zustand');
      expect(quelle).toContain('dropAufAblage(zustand');
      expect(quelle).toContain('aktiviereSitzplatz(zustand');
    });

    it('bindet die Canvas-Darstellung ohne SSR ein und persistiert keine Konva-Knoten', () => {
      expect(quelle).toContain('ssr: false');
      expect(quelle).not.toContain('toJSON');
      expect(quelle).not.toContain('Konva.Node');
    });
  });
});
