'use client';

import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import { berechneMassstab, rasterLinien, cmToPx } from '../../../../../src/domain/raum/koordinaten';

export interface RaumCanvasProps {
  breiteCm: number;
  laengeCm: number;
  rasterCm: number;
}

const MAX_HOEHE_PX = 520;
const FALLBACK_BREITE_PX = 720;
const RAND_PX = 1;

// React-Konva-Editorfläche (M2 #50): rendert ausschließlich aus dem
// validierten Domänenzustand; es werden keine Konva-Nodes persistiert.
// Möbel (#51) und Interaktion (#52) folgen in eigenen Layern.
export default function RaumCanvas({ breiteCm, laengeCm, rasterCm }: RaumCanvasProps) {
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
        </Layer>
      </Stage>
    </div>
  );
}
