'use client';

import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Circle, Group } from 'react-konva';
import { berechneMassstab, rasterLinien, cmToPx } from '../../../../../src/domain/raum/koordinaten';
import type { RaumObjektV1, RaumObjektTyp } from '../../../../../src/domain/raum/objekte';
import type { SitzplatzV1 } from '../../../../../src/domain/raum/sitzplaetze';

export interface RaumCanvasProps {
  breiteCm: number;
  laengeCm: number;
  rasterCm: number;
  objekte?: RaumObjektV1[];
  /** Persistierte Sitzplätze (M2 #54) — rein abgeleitet dargestellt */
  sitzplaetze?: SitzplatzV1[];
  /** ID des aktuell ausgewählten Objekts (M2 #52) */
  ausgewaehltId?: string | null;
  /** Auswahl-Callback — Mausklick/Tap oder Tastatur über die Objektliste */
  onAuswaehlen?: (objektId: string) => void;
  /** Callback nach abgeschlossener Drag-Interaktion (Zentimeterwerte) */
  onBewegt?: (objektId: string, xCm: number, yCm: number) => void;
}

const MAX_HOEHE_PX = 520;
const FALLBACK_BREITE_PX = 720;
const RAND_PX = 1;

/** Minimale Konva-Event-Form — der Renderer bleibt framework-frei testbar. */
interface DragEndEvent {
  target: { x(): number; y(): number };
}

// Rein darstellerische Farben pro Objektart — keine Fachlogik.
const OBJEKT_FARBEN: Record<RaumObjektTyp, { fill: string; stroke: string }> = {
  table_single: { fill: '#dbeafe', stroke: '#1d4ed8' },
  table_double: { fill: '#bfdbfe', stroke: '#1d4ed8' },
  teacher_desk: { fill: '#fef3c7', stroke: '#b45309' },
  board: { fill: '#065f46', stroke: '#064e3b' },
  door: { fill: '#e5e7eb', stroke: '#4b5563' },
  window: { fill: '#e0f2fe', stroke: '#0369a1' },
};

const AUSWAHL_FARBE = '#dc2626';
// Sitzplatzmarker (M2 #54): visuell klar von den Tischflächen unterscheidbar.
const SITZPLATZ_FARBEN = { fill: '#f97316', stroke: '#7c2d12' };
const SITZPLATZ_RADIUS_CM = 10;

// React-Konva-Editorfläche (M2 #50–#52): rendert ausschließlich aus dem
// validierten Domänenzustand; es werden keine Konva-Nodes, Auswahlrahmen
// oder Transformer-Zustände persistiert. Drag-Vorschau läuft nur auf dem
// Node; die fachliche Position wird erst nach dem Loslassen als
// Zentimeterwert nach oben gereicht.
export default function RaumCanvas({
  breiteCm,
  laengeCm,
  rasterCm,
  objekte = [],
  sitzplaetze = [],
  ausgewaehltId = null,
  onAuswaehlen,
  onBewegt,
}: RaumCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerBreitePx, setContainerBreitePx] = useState(FALLBACK_BREITE_PX);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerBreitePx(Math.max(el.clientWidth, 200));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const massstab = berechneMassstab(
    breiteCm,
    laengeCm,
    Math.max(containerBreitePx - RAND_PX * 2, 50),
    MAX_HOEHE_PX,
  );
  const linien = rasterLinien(breiteCm, laengeCm, rasterCm);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Editorfläche ${breiteCm} × ${laengeCm} cm, Raster ${rasterCm} cm`}
      style={{ width: '100%', marginBottom: '2rem' }}
    >
      <Stage width={massstab.breitePx + RAND_PX * 2} height={massstab.hoehePx + RAND_PX * 2}>
        <Layer x={RAND_PX} y={RAND_PX}>
          {/* Raumgrenze */}
          <Rect
            x={0}
            y={0}
            width={massstab.breitePx}
            height={massstab.hoehePx}
            fill="#fdfbf7"
            stroke="#374151"
            strokeWidth={2}
          />
          {/* Sichtbares Raster — rein darstellerisch, nicht persistiert */}
          {linien.vertikal.map((x) => (
            <Line
              key={`v-${x}`}
              points={[cmToPx(x, massstab.pxProCm), 0, cmToPx(x, massstab.pxProCm), massstab.hoehePx]}
              stroke="#d1d5db"
              strokeWidth={1}
            />
          ))}
          {linien.horizontal.map((y) => (
            <Line
              key={`h-${y}`}
              points={[0, cmToPx(y, massstab.pxProCm), massstab.breitePx, cmToPx(y, massstab.pxProCm)]}
              stroke="#d1d5db"
              strokeWidth={1}
            />
          ))}
          {/* Persistierte Raumobjekte (M2 #51) — abgeleitet aus RaumObjektV1.
              Jedes Objekt bildet mit seinen Sitzplätzen (M2 #54) eine
              Konva-Gruppe: Rotation erfolgt um den Objektmittelpunkt
              (offset), und bei Drag bewegen sich Tisch und Sitzplatzmarker
              als eine visuelle Einheit — die Marker liegen als Kinder in
              lokalen Anker-Koordinaten vor. Auswahlmarkierung und
              Drag-Vorschau sind rein visuell; persistiert wird nur die
              validierte Endposition. */}
          {objekte.map((o) => {
            const wPx = cmToPx(o.breite_cm, massstab.pxProCm);
            const hPx = cmToPx(o.tiefe_cm, massstab.pxProCm);
            const farben = OBJEKT_FARBEN[o.typ];
            const ausgewaehlt = o.id === ausgewaehltId;
            const eigeneSitze = sitzplaetze.filter((s) => s.objektId === o.id);
            return (
              <Group
                key={o.id}
                x={cmToPx(o.x_cm, massstab.pxProCm) + wPx / 2}
                y={cmToPx(o.y_cm, massstab.pxProCm) + hPx / 2}
                offsetX={wPx / 2}
                offsetY={hPx / 2}
                rotation={o.rotation_deg}
                draggable={onBewegt !== undefined}
                onClick={() => onAuswaehlen?.(o.id)}
                onTap={() => onAuswaehlen?.(o.id)}
                onDragEnd={(e: DragEndEvent) => {
                  if (!onBewegt) return;
                  // Gruppenposition ist der Mittelpunkt (offset) — zurück auf
                  // die linke obere Ecke des unrotierten Rechtecks in cm.
                  const xCm = (e.target.x() - wPx / 2) / massstab.pxProCm;
                  const yCm = (e.target.y() - hPx / 2) / massstab.pxProCm;
                  onBewegt(o.id, xCm, yCm);
                }}
              >
                <Rect
                  x={0}
                  y={0}
                  width={wPx}
                  height={hPx}
                  fill={farben.fill}
                  stroke={ausgewaehlt ? AUSWAHL_FARBE : farben.stroke}
                  strokeWidth={ausgewaehlt ? 3 : 1.5}
                />
                {eigeneSitze.map((s) => (
                  <Circle
                    key={s.id}
                    x={cmToPx(s.lokalX_cm, massstab.pxProCm)}
                    y={cmToPx(s.lokalY_cm, massstab.pxProCm)}
                    radius={cmToPx(SITZPLATZ_RADIUS_CM, massstab.pxProCm)}
                    fill={SITZPLATZ_FARBEN.fill}
                    stroke={SITZPLATZ_FARBEN.stroke}
                    strokeWidth={1.5}
                    listening={false}
                  />
                ))}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
