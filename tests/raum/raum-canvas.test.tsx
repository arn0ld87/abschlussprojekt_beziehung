import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// react-konva wird durch aufzeichnende Platzhalter ersetzt — der Test prüft
// die abgeleitete Konva-Struktur, ohne eine Canvas-API zu benötigen.
interface LineProps { points: number[] }
interface RectProps { width: number; height: number; stroke?: string }
interface StageProps { width: number; height: number; children?: React.ReactNode }
interface LayerProps { children?: React.ReactNode }

const gerendert = {
  stage: null as StageProps | null,
  rects: [] as RectProps[],
  lines: [] as LineProps[],
};

vi.mock('react-konva', () => ({
  Stage: (props: StageProps) => {
    gerendert.stage = { width: props.width, height: props.height };
    return React.createElement('div', { 'data-testid': 'stage' }, props.children);
  },
  Layer: (props: LayerProps) => React.createElement('div', { 'data-testid': 'layer' }, props.children),
  Rect: (props: RectProps) => {
    gerendert.rects.push(props);
    return React.createElement('div', { 'data-testid': 'rect' });
  },
  Line: (props: LineProps) => {
    gerendert.lines.push(props);
    return React.createElement('div', { 'data-testid': 'line' });
  },
}));

import RaumCanvas from '../../app/(app)/raeume/[id]/_components/RaumCanvas';

describe('RaumCanvas (M2 #50)', () => {
  beforeEachReset();
  function beforeEachReset() {
    gerendert.stage = null;
    gerendert.rects = [];
    gerendert.lines = [];
  }

  it('rendert Raumgrenze und Rasterlinien aus den fachlichen cm-Werten', () => {
    beforeEachReset();
    const html = renderToStaticMarkup(
      React.createElement(RaumCanvas, { breiteCm: 800, laengeCm: 600, rasterCm: 50 }),
    );
    expect(html).toContain('Editorfläche 800 × 600 cm, Raster 50 cm');

    // Genau eine Raumgrenze
    expect(gerendert.rects).toHaveLength(1);

    // 15 vertikale (50..750) + 11 horizontale (50..550) Rasterlinien
    expect(gerendert.lines).toHaveLength(26);
  });

  it('hält das Seitenverhältnis breite_cm : laenge_cm in der Stage exakt ein', () => {
    beforeEachReset();
    renderToStaticMarkup(
      React.createElement(RaumCanvas, { breiteCm: 800, laengeCm: 600, rasterCm: 50 }),
    );
    const stage = gerendert.stage!;
    // Innenmaß ohne 2px Rand
    const innenBreite = stage.width - 2;
    const innenHoehe = stage.height - 2;
    expect(innenBreite / innenHoehe).toBeCloseTo(800 / 600, 6);
  });

  it('begrenzt große Räume auf die maximale Stage-Höhe', () => {
    beforeEachReset();
    renderToStaticMarkup(
      React.createElement(RaumCanvas, { breiteCm: 2000, laengeCm: 1500, rasterCm: 100 }),
    );
    const stage = gerendert.stage!;
    expect(stage.height - 2).toBeLessThanOrEqual(520);
    expect((stage.width - 2) / (stage.height - 2)).toBeCloseTo(2000 / 1500, 6);
  });

  it('ändert die Rasteranzahl mit raster_cm, ohne persistierte Nodes zu erzeugen', () => {
    beforeEachReset();
    renderToStaticMarkup(
      React.createElement(RaumCanvas, { breiteCm: 800, laengeCm: 600, rasterCm: 100 }),
    );
    // 7 vertikale (100..700) + 5 horizontale (100..500)
    expect(gerendert.lines).toHaveLength(12);
    // Raumgrenze bleibt die einzige Rect
    expect(gerendert.rects).toHaveLength(1);
  });
});
