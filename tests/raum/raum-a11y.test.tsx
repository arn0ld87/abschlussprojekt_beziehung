import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Accessibility-Vertrag des Raum-Editors (M2 #55).
 *
 * Zwei Ebenen:
 * 1. Statisches Markup (Initial-Render): Labels, Gruppen, Ladezustand und
 *    Auswahlzustände sind serverseitig prüfbar.
 * 2. Quell-Vertrag für auswahl- und fokusabhängige Merkmale (Toolbar,
 *    Tastaturkürzel, Fokusbindung), die ohne DOM-Interaktion nicht
 *    renderbar sind — geprüft als verbindliche Muster im Komponentenquell.
 *
 * Kein axe/jsdom verfügbar (node-Umgebung): Die Prüfung deckt die
 * WCAG-relevanten, kritikbefundfreien Kernmerkmale ab — benannte
 * Bedienelemente, Struktur-Rollen, Status-Meldungen, Tastaturbedienbarkeit
 * (2.1.1/2.1.4) und Fokusmanagement.
 */

// next/dynamic im node-Kontext: Lade-Fallback aus den realen Optionen
// wiederverwenden, damit der sichtbare Ladezustand tatsächlich geprüft wird.
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

// Button-Mock bildet den öffentlichen A11y-Vertrag der echten Komponente
// (ariaLabel → aria-label, ariaPressed → aria-pressed) 1:1 ab.
vi.mock('../../src/ui/Button', () => ({
  default: ({
    children,
    type,
    disabled,
    ariaLabel,
    ariaPressed,
  }: {
    children?: React.ReactNode;
    type?: string;
    disabled?: boolean;
    ariaLabel?: string;
    ariaPressed?: boolean;
  }) =>
    React.createElement(
      'button',
      { type: type ?? 'button', disabled: disabled ?? false, 'aria-label': ariaLabel, 'aria-pressed': ariaPressed },
      children,
    ),
}));

import RaumEditor from '../../app/(app)/raeume/[id]/_components/RaumEditor';
import type { RaumEditorProps } from '../../app/(app)/raeume/[id]/_components/RaumEditor';

const raum: RaumEditorProps['raum'] = {
  id: 'raum_a11y',
  name: 'A11y-Referenzraum (Fantasie)',
  breiteCm: 800,
  laengeCm: 600,
  rasterCm: 50,
  dokumentVersion: 3,
  objekte: [
    { id: 'obj_tisch', typ: 'table_single', x_cm: 100, y_cm: 100, breite_cm: 60, tiefe_cm: 50, rotation_deg: 0 },
    { id: 'obj_tafel', typ: 'board', x_cm: 200, y_cm: 0, breite_cm: 400, tiefe_cm: 15, rotation_deg: 0 },
  ],
  sitzplaetze: [
    { id: 'obj_tisch__sitz_1', objektId: 'obj_tisch', lokalX_cm: 30, lokalY_cm: 50, bezeichnung: 'Sitz 1' },
  ],
};

function markup(): string {
  return renderToStaticMarkup(React.createElement(RaumEditor, { raum }));
}

describe('Raum-Editor Accessibility — statisches Markup (M2 #55)', () => {
  it('verknüpft jedes Formularfeld mit einem benannten Label (htmlFor/id)', () => {
    const html = markup();
    for (const feld of ['name', 'breiteCm', 'laengeCm', 'rasterCm']) {
      expect(html).toContain(`for="${feld}"`);
      expect(html).toContain(`id="${feld}"`);
    }
    expect(html).toContain('Breite (cm)');
    expect(html).toContain('Länge (cm)');
    expect(html).toContain('Raster (cm)');
  });

  it('kennzeichnet die Möbelpalette als benannte Gruppe', () => {
    const html = markup();
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Standardobjekte hinzufügen"');
  });

  it('meldet den Ladezustand der Editorfläche als Status', () => {
    const html = markup();
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Editorfläche lädt"');
  });

  it('bietet die Objektliste als tastaturbedienbare Auswahl mit Auswahlzustand', () => {
    const html = markup();
    expect(html).toContain('aria-label="Objektliste — Auswahl per Tastatur möglich"');
    // Beide Objekte sind als Schaltflächen mit aria-pressed erreichbar
    expect(html.match(/aria-pressed="false"/g)?.length).toBe(2);
  });

  it('enthält keine unbeschrifteten icon-only Schaltflächen im Initial-Render', () => {
    const html = markup();
    // Jede Schaltfläche trägt entweder sichtbaren Text oder ein aria-label
    const buttons = html.match(/<button[^>]*>[\s\S]*?<\/button>/g) ?? [];
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) {
      const text = b.replace(/<[^>]+>/g, '').trim();
      const hatLabel = b.includes('aria-label=');
      expect(text.length > 0 || hatLabel).toBe(true);
    }
  });
});

describe('Raum-Editor Accessibility — Quell-Vertrag (auswahl- und fokusabhängig)', () => {
  const quelle = readFileSync(
    resolve(process.cwd(), 'app/(app)/raeume/[id]/_components/RaumEditor.tsx'),
    'utf8',
  );

  it('kennzeichnet die Objektaktionen als benannte Toolbar', () => {
    expect(quelle).toContain('role="toolbar"');
    expect(quelle).toContain('aria-label="Aktionen für das ausgewählte Objekt"');
  });

  it('benennt jede Toolbar-Aktion inklusive Tastaturkürzel', () => {
    expect(quelle).toContain('ariaLabel="Objekt um 90 Grad drehen (Taste R)"');
    expect(quelle).toContain('ariaLabel="Objekt duplizieren (Taste D)"');
    expect(quelle).toContain('ariaLabel="Objekt löschen (Taste Entf)"');
    // Kürzel stehen zusätzlich als Text (<kbd>) sichtbar im Dokument
    expect(quelle).toContain('<kbd>');
  });

  it('spiegelt den Auswahlzustand in der Objektliste (aria-pressed)', () => {
    expect(quelle).toContain('ariaPressed={o.id === ausgewaehltId}');
  });

  it('macht den Canvas-Bereich fokussierbar und benannt', () => {
    expect(quelle).toContain('tabIndex={-1}');
    expect(quelle).toContain('aria-label="Raum-Canvas — Auswahl eines Objekts aktiviert die Tastaturkürzel R/D/Entf"');
  });

  it('bindet Ein-Zeichen-Shortcuts an den Fokus im Editor (WCAG 2.1.4)', () => {
    expect(quelle).toContain('editorRef.current?.contains(document.activeElement)');
    // System-/Browserkürzel mit Modifiern bleiben unangetastet
    expect(quelle).toContain('e.ctrlKey || e.metaKey || e.altKey');
    // Kürzel feuern niemals in Eingabefeldern
    expect(quelle).toContain('istEingabefeld(e.target)');
  });

  it('fokussiert den Canvas-Bereich nach einer Auswahl, damit R/D greifen', () => {
    expect(quelle).toContain('canvasBereichRef.current?.focus({ preventScroll: true })');
  });

  it('stellt Sitzplätze als benannte, lesbare Liste bereit (Konva-Marker sind nicht DOM-zugänglich)', () => {
    expect(quelle).toContain('aria-label={`Sitzplätze an ${STANDARD_OBJEKTE[ausgewaehltObjekt.typ].label}`}');
    expect(quelle).toContain('{s.bezeichnung ?? s.id}');
  });

  it('meldet ungespeicherte Maßänderungen als Hinweis (role=note)', () => {
    expect(quelle).toContain('role="note"');
    expect(quelle).toContain('Verschieben ist erst nach dem Speichern möglich');
  });
});
