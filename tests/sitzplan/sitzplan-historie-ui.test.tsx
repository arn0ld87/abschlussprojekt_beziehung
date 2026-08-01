import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { erzeugeSitzplaetze } from '../../src/domain/raum/sitzplaetze';
import type { RaumObjektV1 } from '../../src/domain/raum/objekte';
import { erzeugeHistorie, type AenderungsZustand } from '../../src/domain/sitzplan/historie';
import type { Zuordnung } from '../../src/domain/sitzplan';
import {
  AENDERUNGS_ZUSTAND_TEXT,
  ermittleZuordnungsZustand,
  tastaturkuerzel,
} from '../../app/(app)/sitzplaene/[id]/_components/historie-bedienung';

/**
 * Sichtbarer Teil der Editor-Historie (M3 #58).
 *
 * Gerendert wird echtes Markup über `renderToStaticMarkup` — die Komponenten
 * werden also tatsächlich ausgeführt. Kein jsdom und keine Testing-Library in
 * der node-Umgebung: Ereignisse lassen sich hier nicht auslösen. Genau deshalb
 * liegen alle Bedienentscheidungen im framework-freien Modul und sind dort als
 * Verhalten geprüft; hier wird belegt, dass die Komponenten diese Zustände
 * überhaupt und unterscheidbar darstellen.
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

import HistorieLeiste from '../../app/(app)/sitzplaene/[id]/_components/HistorieLeiste';
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

const props = (zuordnungen: Zuordnung[], sitzplanId = 'plan_fantasie_a') => ({
  sitzplanId,
  geometrie: { breiteCm: 800, laengeCm: 600, rasterCm: 50, objekte: [doppeltisch], sitzplaetze },
  schueler: [
    { id: 'sch_1', name: 'Anna Fantasie', initialen: 'AF', farbe: '#4F46E5' },
    { id: 'sch_2', name: 'Bruno Fantasie', initialen: 'BF', farbe: '#0D9488' },
  ],
  zuordnungen,
  befunde: [],
});

const leiste = (teile: Partial<React.ComponentProps<typeof HistorieLeiste>> = {}) =>
  renderToStaticMarkup(
    React.createElement(HistorieLeiste, {
      zustand: 'gespeichert',
      kannZurueck: false,
      kannVor: false,
      speichert: false,
      kuerzel: tastaturkuerzel('sonstige'),
      onZurueck: () => {},
      onVor: () => {},
      ...teile,
    }),
  );

describe('Sichtbare Editor-Historie (M3 #58)', () => {
  describe('Bedienelemente', () => {
    it('rendert eine benannte Gruppe mit beiden Schaltflächen', () => {
      const html = leiste();
      expect(html).toContain('role="group"');
      expect(html).toContain('aria-label="Änderungshistorie"');
      expect(html).toContain('Rückgängig');
      expect(html).toContain('Wiederherstellen');
    });

    it('sperrt die Schaltflächen ohne verfügbaren Schritt, ohne den Fokus zu verlieren', () => {
      const gesperrt = leiste({ kannZurueck: false, kannVor: false });
      // Zwei Schaltflächen, beide als gesperrt ausgezeichnet — aber nicht
      // `disabled`, sonst fiele der Fokus auf <body> (WCAG 2.4.3).
      expect(gesperrt.match(/aria-disabled="true"/g)).toHaveLength(2);
      expect(gesperrt).not.toMatch(/<button[^>]*\sdisabled/);

      const zurueckMoeglich = leiste({ kannZurueck: true, kannVor: false });
      expect(zurueckMoeglich.match(/aria-disabled="true"/g)).toHaveLength(1);
      expect(zurueckMoeglich).toContain('aria-disabled="false"');

      // Während eines Schreibvorgangs sind beide gesperrt, auch wenn Schritte
      // verfügbar wären.
      const beimSpeichern = leiste({ kannZurueck: true, kannVor: true, speichert: true });
      expect(beimSpeichern.match(/aria-disabled="true"/g)).toHaveLength(2);
    });

    it('sagt die Tastaturkürzel der jeweiligen Plattform an', () => {
      const sonstige = leiste({ kuerzel: tastaturkuerzel('sonstige') });
      expect(sonstige).toContain('aria-keyshortcuts="Control+Z"');
      expect(sonstige).toContain('aria-keyshortcuts="Control+Shift+Z Control+Y"');
      expect(sonstige).not.toContain('Meta+');

      const mac = leiste({ kuerzel: tastaturkuerzel('mac') });
      expect(mac).toContain('aria-keyshortcuts="Meta+Z"');
      expect(mac).toContain('aria-keyshortcuts="Meta+Shift+Z"');
      expect(mac).not.toContain('Control+');
    });
  });

  describe('Änderungszustand', () => {
    const zustaende: AenderungsZustand[] = ['gespeichert', 'geändert', 'speichert', 'fehler'];

    it('zeigt für jeden Zustand genau dessen Beschriftung und keine der anderen', () => {
      for (const zustand of zustaende) {
        const html = leiste({ zustand });
        expect(html, zustand).toContain(AENDERUNGS_ZUSTAND_TEXT[zustand]);

        for (const anderer of zustaende.filter((z) => z !== zustand)) {
          expect(html, `${zustand} zeigt zusätzlich ${anderer}`).not.toContain(
            AENDERUNGS_ZUSTAND_TEXT[anderer],
          );
        }
      }
    });

    it('benennt den Zustand sichtbar als solchen', () => {
      expect(leiste({ zustand: 'geändert' })).toContain('Änderungszustand:');
    });
  });

  describe('Einbindung in den Editor', () => {
    const html = renderToStaticMarkup(
      React.createElement(SitzplanZuordnung, props([{ sitzplatzId: sitzplaetze[0].id, schuelerId: 'sch_1' }])),
    );

    it('bindet die Historienleiste in die Schülerzuordnung ein', () => {
      expect(html).toContain('aria-label="Änderungshistorie"');
      expect(html).toContain('Rückgängig');
      expect(html).toContain('Wiederherstellen');
    });

    it('zeigt einen frisch geladenen Plan als gespeichert und ohne verfügbare Schritte', () => {
      // Erwartung nicht als Konstante, sondern aus derselben reinen Funktion
      // abgeleitet, die die Komponente verwendet.
      const erwartet =
        AENDERUNGS_ZUSTAND_TEXT[
          ermittleZuordnungsZustand(
            erzeugeHistorie<Zuordnung[]>([{ sitzplatzId: sitzplaetze[0].id, schuelerId: 'sch_1' }]),
            { speichert: false, fehler: false },
          )
        ];
      expect(html).toContain(erwartet);
      expect(html).toContain(AENDERUNGS_ZUSTAND_TEXT.gespeichert);
      expect(html).not.toContain(AENDERUNGS_ZUSTAND_TEXT['geändert']);

      // Ohne Vorgeschichte ist weder Rückgängig noch Wiederherstellen möglich.
      const leisteAusschnitt = html.slice(html.indexOf('aria-label="Änderungshistorie"'));
      expect(leisteAusschnitt.slice(0, leisteAusschnitt.indexOf('</div>')).match(/aria-disabled="true"/g)).toHaveLength(
        2,
      );
    });

    it('nennt die Kürzel auch in der sichtbaren Bedienhilfe', () => {
      expect(html).toMatch(/rückgängig/i);
      expect(html).toMatch(/Namensfeld/i);
    });

    it('stellt einen anderen Plan mit dessen eigenen Zuordnungen dar', () => {
      // Der Reset der Historie beim Planwechsel läuft in der Renderphase und
      // ist als reine Entscheidung in `pruefePlanwechsel` geprüft — ein
      // statisches Rendering erzeugt je Aufruf eine neue Instanz und kann den
      // Zweig nicht auslösen. Belegt wird hier, dass die Darstellung dem
      // jeweils übergebenen Plan folgt.
      const andererPlan = renderToStaticMarkup(
        React.createElement(
          SitzplanZuordnung,
          props([{ sitzplatzId: sitzplaetze[1].id, schuelerId: 'sch_2' }], 'plan_fantasie_b'),
        ),
      );
      expect(andererPlan).toContain(AENDERUNGS_ZUSTAND_TEXT.gespeichert);
      // Auf dem zweiten Plan sitzt Bruno, Anna liegt in der Ablage.
      expect(andererPlan).toMatch(/aria-label="[^"]*Bruno Fantasie"/);
    });
  });
});
