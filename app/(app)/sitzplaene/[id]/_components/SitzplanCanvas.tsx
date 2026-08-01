'use client';

import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Circle, Group, Text } from 'react-konva';
import { berechneMassstab, rasterLinien, cmToPx } from '../../../../../src/domain/raum/koordinaten';
import type { RaumObjektV1, RaumObjektTyp } from '../../../../../src/domain/raum/objekte';
import type { SitzplatzV1 } from '../../../../../src/domain/raum/sitzplaetze';

export interface SitzplanCanvasBelegung {
  sitzplatzId: string;
  initialen: string;
  farbe: string;
}

export interface SitzplanCanvasProps {
  breiteCm: number;
  laengeCm: number;
  rasterCm: number;
  objekte: RaumObjektV1[];
  sitzplaetze: SitzplatzV1[];
  /** Abgeleitete Belegung — nie persistiert, immer aus den Zuordnungen berechnet */
  belegung: SitzplanCanvasBelegung[];
  ausgewaehlterSitzplatzId?: string | null;
  onSitzplatzKlick?: (sitzplatzId: string) => void;
}

const MAX_HOEHE_PX = 520;
const FALLBACK_BREITE_PX = 720;
const RAND_PX = 1;

const OBJEKT_FARBEN: Record<RaumObjektTyp, { fill: string; stroke: string }> = {
  table_single: { fill: '#dbeafe', stroke: '#1d4ed8' },
  table_double: { fill: '#bfdbfe', stroke: '#1d4ed8' },
  teacher_desk: { fill: '#fef3c7', stroke: '#b45309' },
  board: { fill: '#065f46', stroke: '#064e3b' },
  door: { fill: '#e5e7eb', stroke: '#4b5563' },
  window: { fill: '#e0f2fe', stroke: '#0369a1' },
};

const FREIER_PLATZ = { fill: '#ffffff', stroke: '#7c2d12' };
const AUSWAHL_FARBE = '#dc2626';
const SITZPLATZ_RADIUS_CM = 14;

/**
 * Sitzplan-Editorfläche (M3 #57): rendert ausschließlich aus dem validierten,
 * eingefrorenen Domänenzustand. Belegte Plätze tragen die Farbe und Initialen
 * ihres Schülerprofils, freie Plätze bleiben ungefüllt. Es werden keine
 * Konva-Nodes, Auswahlrahmen oder Transformer-Zustände persistiert (ADR-0002,
 * ADR-0003).
 *
 * Der Canvas ist bewusst nur eine zweite, visuelle Sicht: Die vollständige
 * Bedienung inklusive Tastatur liegt in der DOM-Liste daneben, weil
 * Konva-Formen keine zugänglichen Bedienelemente sind.
 */
export default function SitzplanCanvas({
  breiteCm,
  laengeCm,
  rasterCm,
  objekte,
  sitzplaetze,
  belegung,
  ausgewaehlterSitzplatzId = null,
  onSitzplatzKlick,
}: SitzplanCanvasProps) {
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
  const belegtNach = new Map(belegung.map((b) => [b.sitzplatzId, b]));
  const radiusPx = cmToPx(SITZPLATZ_RADIUS_CM, massstab.pxProCm);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Sitzplan-Editorfläche ${breiteCm} × ${laengeCm} cm mit ${sitzplaetze.length} Sitzplätzen, davon ${belegung.length} belegt`}
      style={{ width: '100%', marginBottom: '1.5rem' }}
    >
      <Stage width={massstab.breitePx + RAND_PX * 2} height={massstab.hoehePx + RAND_PX * 2}>
        <Layer x={RAND_PX} y={RAND_PX}>
          <Rect
            x={0}
            y={0}
            width={massstab.breitePx}
            height={massstab.hoehePx}
            fill="#fdfbf7"
            stroke="#374151"
            strokeWidth={2}
          />
          {linien.vertikal.map((x) => (
            <Line
              key={`v-${x}`}
              points={[cmToPx(x, massstab.pxProCm), 0, cmToPx(x, massstab.pxProCm), massstab.hoehePx]}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          ))}
          {linien.horizontal.map((y) => (
            <Line
              key={`h-${y}`}
              points={[0, cmToPx(y, massstab.pxProCm), massstab.breitePx, cmToPx(y, massstab.pxProCm)]}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          ))}
          {objekte.map((o) => {
            const wPx = cmToPx(o.breite_cm, massstab.pxProCm);
            const hPx = cmToPx(o.tiefe_cm, massstab.pxProCm);
            const farben = OBJEKT_FARBEN[o.typ];
            const eigeneSitze = sitzplaetze.filter((s) => s.objektId === o.id);
            return (
              <Group
                key={o.id}
                x={cmToPx(o.x_cm, massstab.pxProCm) + wPx / 2}
                y={cmToPx(o.y_cm, massstab.pxProCm) + hPx / 2}
                offsetX={wPx / 2}
                offsetY={hPx / 2}
                rotation={o.rotation_deg}
              >
                <Rect x={0} y={0} width={wPx} height={hPx} fill={farben.fill} stroke={farben.stroke} strokeWidth={1.5} />
                {eigeneSitze.map((s) => {
                  const belegt = belegtNach.get(s.id);
                  const ausgewaehlt = s.id === ausgewaehlterSitzplatzId;
                  return (
                    <Group
                      key={s.id}
                      x={cmToPx(s.lokalX_cm, massstab.pxProCm)}
                      y={cmToPx(s.lokalY_cm, massstab.pxProCm)}
                      onClick={() => onSitzplatzKlick?.(s.id)}
                      onTap={() => onSitzplatzKlick?.(s.id)}
                    >
                      <Circle
                        radius={radiusPx}
                        fill={belegt ? belegt.farbe : FREIER_PLATZ.fill}
                        stroke={ausgewaehlt ? AUSWAHL_FARBE : FREIER_PLATZ.stroke}
                        strokeWidth={ausgewaehlt ? 3 : 1.5}
                      />
                      {belegt && (
                        <Text
                          text={belegt.initialen}
                          fontSize={Math.max(radiusPx * 0.8, 8)}
                          fill="#ffffff"
                          align="center"
                          verticalAlign="middle"
                          width={radiusPx * 2}
                          height={radiusPx * 2}
                          offsetX={radiusPx}
                          offsetY={radiusPx}
                          listening={false}
                        />
                      )}
                    </Group>
                  );
                })}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
