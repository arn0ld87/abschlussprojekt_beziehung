import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// react-konva wird durch aufzeichnende Platzhalter ersetzt — der Test prüft
// die abgeleitete Konva-Struktur, ohne eine Canvas-API zu benötigen.
interface LineProps { points: number[] }
interface RectProps {
  width: number;
  height: number;
  stroke?: string;
  strokeWidth?: number;
  rotation?: number;
  offsetX?: number;
  offsetY?: number;
  draggable?: boolean;
  onClick?: () => void;
  onTap?: () => void;
  onDragEnd?: (e: { target: { x(): number; y(): number } }) => void;
}
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

  it('rendert alle sechs Objektarten als eigene Rects aus dem Domänenzustand (M2 #51)', () => {
    beforeEachReset();
    const objekte = [
      { id: 'o1', typ: 'table_single', x_cm: 100, y_cm: 200, breite_cm: 60, tiefe_cm: 50, rotation_deg: 0 },
      { id: 'o2', typ: 'table_double', x_cm: 200, y_cm: 200, breite_cm: 120, tiefe_cm: 50, rotation_deg: 0 },
      { id: 'o3', typ: 'teacher_desk', x_cm: 320, y_cm: 55, breite_cm: 160, tiefe_cm: 80, rotation_deg: 0 },
      { id: 'o4', typ: 'board', x_cm: 200, y_cm: 0, breite_cm: 400, tiefe_cm: 15, rotation_deg: 0 },
      { id: 'o5', typ: 'door', x_cm: 0, y_cm: 580, breite_cm: 90, tiefe_cm: 20, rotation_deg: 0 },
      { id: 'o6', typ: 'window', x_cm: 0, y_cm: 300, breite_cm: 180, tiefe_cm: 15, rotation_deg: 0 },
    ] as const;
    renderToStaticMarkup(
      React.createElement(RaumCanvas, { breiteCm: 800, laengeCm: 600, rasterCm: 50, objekte: [...objekte] }),
    );
    // Raumgrenze + sechs Objekt-Rects — rein abgeleitet, nichts persistiert
    expect(gerendert.rects).toHaveLength(7);
  });

  it('rotiert Objekte um ihren Mittelpunkt (Konva offset)', () => {
    beforeEachReset();
    const objekte = [
      { id: 'o1', typ: 'teacher_desk', x_cm: 100, y_cm: 100, breite_cm: 160, tiefe_cm: 80, rotation_deg: 90 },
    ] as const;
    renderToStaticMarkup(
      React.createElement(RaumCanvas, { breiteCm: 800, laengeCm: 600, rasterCm: 50, objekte: [...objekte] }),
    );
    const objektRect = gerendert.rects[1] as { rotation?: number; offsetX?: number; offsetY?: number; width: number; height: number };
    expect(objektRect.rotation).toBe(90);
    expect(objektRect.offsetX).toBeCloseTo(objektRect.width / 2, 6);
    expect(objektRect.offsetY).toBeCloseTo(objektRect.height / 2, 6);
  });

  // --- M2 #52: Auswahl und Drag-and-drop ---

  it('meldet Klicks als Auswahl und markiert das ausgewählte Objekt sichtbar', () => {
    beforeEachReset();
    const auswahl: string[] = [];
    const objekte = [
      { id: 'o1', typ: 'table_single', x_cm: 100, y_cm: 100, breite_cm: 60, tiefe_cm: 50, rotation_deg: 0 },
      { id: 'o2', typ: 'table_double', x_cm: 300, y_cm: 100, breite_cm: 120, tiefe_cm: 50, rotation_deg: 0 },
    ] as const;
    renderToStaticMarkup(
      React.createElement(RaumCanvas, {
        breiteCm: 800,
        laengeCm: 600,
        rasterCm: 50,
        objekte: [...objekte],
        ausgewaehltId: 'o2',
        onAuswaehlen: (id: string) => auswahl.push(id),
      }),
    );
    const tisch = gerendert.rects[1];
    const doppeltisch = gerendert.rects[2];

    // Auswahlmarkierung: nur das ausgewählte Objekt ist hervorgehoben
    expect(doppeltisch.stroke).toBe('#dc2626');
    expect(doppeltisch.strokeWidth).toBe(3);
    expect(tisch.stroke).not.toBe('#dc2626');

    // Klick reicht die Objekt-ID nach oben
    tisch.onClick?.();
    expect(auswahl).toEqual(['o1']);
  });

  it('reicht das Drag-End als Zentimeterposition der linken oberen Ecke nach oben', () => {
    beforeEachReset();
    const bewegungen: Array<[string, number, number]> = [];
    const objekte = [
      { id: 'o1', typ: 'table_single', x_cm: 100, y_cm: 100, breite_cm: 60, tiefe_cm: 50, rotation_deg: 0 },
    ] as const;
    renderToStaticMarkup(
      React.createElement(RaumCanvas, {
        breiteCm: 800,
        laengeCm: 600,
        rasterCm: 50,
        objekte: [...objekte],
        onBewegt: (id: string, x: number, y: number) => bewegungen.push([id, x, y]),
      }),
    );
    const tisch = gerendert.rects[1];
    expect(tisch.draggable).toBe(true);

    // Fallback-Container 720px → pxProCm = 520/600 (Höhenlimit)
    const pxProCm = 520 / 600;
    const nodeXPx = 200;
    const nodeYPx = 150;
    tisch.onDragEnd?.({ target: { x: () => nodeXPx, y: () => nodeYPx } });

    expect(bewegungen).toHaveLength(1);
    const [id, xCm, yCm] = bewegungen[0];
    expect(id).toBe('o1');
    expect(xCm).toBeCloseTo((nodeXPx - (60 * pxProCm) / 2) / pxProCm, 6);
    expect(yCm).toBeCloseTo((nodeYPx - (50 * pxProCm) / 2) / pxProCm, 6);
  });

  it('bleibt ohne Interaktions-Callbacks statisch (abwärtskompatibel)', () => {
    beforeEachReset();
    const objekte = [
      { id: 'o1', typ: 'board', x_cm: 200, y_cm: 0, breite_cm: 400, tiefe_cm: 15, rotation_deg: 0 },
    ] as const;
    renderToStaticMarkup(
      React.createElement(RaumCanvas, { breiteCm: 800, laengeCm: 600, rasterCm: 50, objekte: [...objekte] }),
    );
    expect(gerendert.rects[1].draggable).toBe(false);
  });
});
