'use client';

import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import { berechneMassstab, rasterLinien, cmToPx } from '../../../../../src/domain/raum/koordinaten';
import type { RaumObjektV1, RaumObjektTyp } from '../../../../../src/domain/raum/objekte';

export interface RaumCanvasProps {
  breiteCm: number;
  laengeCm: number;
  rasterCm: number;
  objekte?: RaumObjektV1[];
}

const MAX_HOEHE_PX = 520;
const FALLBACK_BREITE_PX = 720;
const RAND_PX = 1;

// Rein darstellerische Farben pro Objektart — keine Fachlogik.
const OBJEKT_FARBEN: Record<RaumObjektTyp, { fill: string; stroke: string }> = {
  table_single: { fill: '#dbeafe', stroke: '#1d4ed8' },
  table_double: { fill: '#bfdbfe', stroke: '#1d4ed8' },
  teacher_desk: { fill: '#fef3c7', stroke: '#b45309' },
  board: { fill: '#065f46', stroke: '#064e3b' },
  door: { fill: '#e5e7eb', stroke: '#4b5563' },
  window: { fill: '#e0f2fe', stroke: '#0369a1' },
};

// React-Konva-Editorfläche (M2 #50/#51): rendert ausschließlich aus dem
// validierten Domänenzustand; es werden keine Konva-Nodes persistiert.
// Der Renderer enthält keine Persistenzlogik — Objekte kommen als Props.
export default function RaumCanvas({ breiteCm, laengeCm, rasterCm, objekte = [] }: RaumCanvasProps) {
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
              Rotation erfolgt um den Objektmittelpunkt (Konva offset). */}
          {objekte.map((o) => {
            const wPx = cmToPx(o.breite_cm, massstab.pxProCm);
            const hPx = cmToPx(o.tiefe_cm, massstab.pxProCm);
            const farben = OBJEKT_FARBEN[o.typ];
            return (
              <Rect
                key={o.id}
                x={cmToPx(o.x_cm, massstab.pxProCm) + wPx / 2}
                y={cmToPx(o.y_cm, massstab.pxProCm) + hPx / 2}
                width={wPx}
                height={hPx}
                offsetX={wPx / 2}
                offsetY={hPx / 2}
                rotation={o.rotation_deg}
                fill={farben.fill}
                stroke={farben.stroke}
                strokeWidth={1.5}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
