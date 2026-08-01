'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { RaumObjektV1 } from '../../../../../src/domain/raum/objekte';
import type { SitzplatzV1 } from '../../../../../src/domain/raum/sitzplaetze';
import type { Zuordnung } from '../../../../../src/domain/sitzplan';
import {
  setzeSchueler,
  tausche,
  entferne,
  type ZuordnungBefund,
} from '../../../../../src/domain/sitzplan/zuordnung-commands';

// react-konva braucht den Browser — bewusst ohne SSR geladen (Ladezustand sichtbar).
const SitzplanCanvas = dynamic(() => import('./SitzplanCanvas'), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-label="Sitzplan-Editorfläche lädt"
      style={{
        marginBottom: '1.5rem',
        padding: '2rem',
        border: '1px dashed #9ca3af',
        borderRadius: '6px',
        color: '#4b5563',
        textAlign: 'center',
      }}
    >
      Editorfläche lädt …
    </div>
  ),
});

export interface SitzplanZuordnungSchueler {
  id: string;
  name: string;
  initialen: string;
  farbe: string;
}

export interface SitzplanZuordnungProps {
  sitzplanId: string;
  geometrie: {
    breiteCm: number;
    laengeCm: number;
    rasterCm: number;
    objekte: RaumObjektV1[];
    sitzplaetze: SitzplatzV1[];
  };
  /** Aktive Schülerprofile der Quellklasse — soft-gelöschte werden nicht angeboten */
  schueler: SitzplanZuordnungSchueler[];
  zuordnungen: Zuordnung[];
  befunde: ZuordnungBefund[];
}

/** Auswahl für die tastaturbedienbare Alternative zum Ziehen. */
type Auswahl =
  | { art: 'ablage'; schuelerId: string }
  | { art: 'sitzplatz'; sitzplatzId: string }
  | null;

const DRAG_MIME = 'text/plain';
// Darstellung einer Zuordnung auf ein nicht mehr aktives Schülerprofil: Der
// Platz ist belegt, aber nicht auflösbar — er darf im Canvas nicht wie ein
// freier Platz aussehen.
const UNBEKANNT_FARBE = '#9ca3af';
const UNBEKANNT_INITIALEN = '?';

/**
 * Schülerzuordnung im Sitzplan-Editor (M3 #57).
 *
 * Zwei gleichwertige Bedienwege auf denselben framework-freien Commands:
 * Drag-and-drop (Ablage → Platz, Platz → Platz, Platz → belegter Platz als
 * definierter Tausch, Platz → Ablage) und — als hartes Kriterium, nicht als
 * Zugabe — Auswahl und Aktion über native Schaltflächen, damit der Editor
 * vollständig mit der Tastatur bedienbar bleibt (WCAG 2.1.1).
 *
 * Die Ablage ist abgeleitet, nicht gespeichert: „in der Ablage" heißt „aktiver
 * Schüler ohne Eintrag in den Zuordnungen". Persistiert wird ausschließlich
 * über den Sitzplan-Endpunkt; diese Komponente kennt weder Datenbank noch
 * Konva-Serialisierung.
 */
export default function SitzplanZuordnung({
  sitzplanId,
  geometrie,
  schueler,
  zuordnungen: initialeZuordnungen,
  befunde,
}: SitzplanZuordnungProps) {
  const [zuordnungen, setZuordnungen] = useState<Zuordnung[]>(initialeZuordnungen);
  const [auswahl, setAuswahl] = useState<Auswahl>(null);
  const [meldung, setMeldung] = useState('Kein Schüler und kein Sitzplatz ausgewählt.');
  const [fehler, setFehler] = useState('');
  const [speichert, setSpeichert] = useState(false);

  const schuelerNach = new Map(schueler.map((s) => [s.id, s]));
  const belegtNach = new Map(zuordnungen.map((z) => [z.sitzplatzId, z.schuelerId]));
  const sitzend = new Set(zuordnungen.map((z) => z.schuelerId));
  const ablage = schueler.filter((s) => !sitzend.has(s.id));

  const nameVon = (schuelerId: string) => schuelerNach.get(schuelerId)?.name ?? 'nicht mehr aktives Schülerprofil';
  const platzName = (sitz: SitzplatzV1) => sitz.bezeichnung ?? sitz.id;

  /**
   * Schreibt den vollständigen gewünschten Zustand. Schlägt das Speichern
   * fehl, wird auf den letzten bestätigten Stand zurückgesetzt — die
   * Oberfläche zeigt dann nie eine Zuordnung, die der Server nicht kennt.
   */
  const speichere = async (neu: Zuordnung[], erfolgsmeldung: string) => {
    if (speichert) return;
    const vorher = zuordnungen;

    setZuordnungen(neu);
    setAuswahl(null);
    setFehler('');
    setSpeichert(true);

    try {
      const res = await fetch(`/api/sitzplaene/${sitzplanId}/zuordnungen`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zuordnungen: neu }),
      });

      if (res.ok) {
        const sitzplan = await res.json();
        setZuordnungen(sitzplan.canvasDocument.zuordnungen);
        setMeldung(erfolgsmeldung);
      } else {
        const data = await res.json().catch(() => ({}));
        setZuordnungen(vorher);
        setFehler(data.error?.message || 'Speichern fehlgeschlagen.');
        setMeldung('Änderung verworfen.');
      }
    } catch {
      setZuordnungen(vorher);
      setFehler('Speichern fehlgeschlagen.');
      setMeldung('Änderung verworfen.');
    } finally {
      setSpeichert(false);
    }
  };

  /** Ein Schüler aus der Ablage wird ausgewählt oder abgewählt. */
  const waehleAusAblage = (schuelerId: string) => {
    if (auswahl?.art === 'ablage' && auswahl.schuelerId === schuelerId) {
      setAuswahl(null);
      setMeldung('Auswahl aufgehoben.');
      return;
    }
    setAuswahl({ art: 'ablage', schuelerId });
    setMeldung(`${nameVon(schuelerId)} ausgewählt. Jetzt einen Sitzplatz aktivieren.`);
  };

  /** Zentrale Aktion auf einen Sitzplatz — identisch für Klick, Tastatur und Drop. */
  const aktiviereSitzplatz = (sitz: SitzplatzV1) => {
    const belegtVon = belegtNach.get(sitz.id);

    if (auswahl?.art === 'ablage') {
      void speichere(
        setzeSchueler(zuordnungen, { schuelerId: auswahl.schuelerId, sitzplatzId: sitz.id }),
        `${nameVon(auswahl.schuelerId)} sitzt jetzt auf ${platzName(sitz)}.`,
      );
      return;
    }

    if (auswahl?.art === 'sitzplatz') {
      if (auswahl.sitzplatzId === sitz.id) {
        setAuswahl(null);
        setMeldung('Auswahl aufgehoben.');
        return;
      }
      void speichere(
        tausche(zuordnungen, auswahl.sitzplatzId, sitz.id),
        belegtVon ? `Plätze getauscht mit ${platzName(sitz)}.` : `Auf ${platzName(sitz)} verschoben.`,
      );
      return;
    }

    if (!belegtVon) {
      setMeldung(`${platzName(sitz)} ist frei. Erst einen Schüler in der Ablage auswählen.`);
      return;
    }

    setAuswahl({ art: 'sitzplatz', sitzplatzId: sitz.id });
    setMeldung(`${nameVon(belegtVon)} auf ${platzName(sitz)} ausgewählt. Jetzt Zielplatz oder Ablage aktivieren.`);
  };

  /** Zurücklegen in die Ablage — Ziel eines Drops und eigene Schaltfläche. */
  const legeZurueck = (schuelerId: string) => {
    void speichere(entferne(zuordnungen, schuelerId), `${nameVon(schuelerId)} liegt wieder in der Ablage.`);
  };

  // Drag-and-drop: Die Nutzlast beschreibt die Quelle; ausgewertet wird sie
  // über exakt dieselben Commands wie der Tastaturweg.
  const dragStart = (e: React.DragEvent, nutzlast: string) => {
    e.dataTransfer.setData(DRAG_MIME, nutzlast);
    e.dataTransfer.effectAllowed = 'move';
  };

  const erlaubeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const dropAufSitzplatz = (e: React.DragEvent, sitz: SitzplatzV1) => {
    e.preventDefault();
    const nutzlast = e.dataTransfer.getData(DRAG_MIME);
    if (nutzlast.startsWith('schueler:')) {
      const schuelerId = nutzlast.slice('schueler:'.length);
      void speichere(
        setzeSchueler(zuordnungen, { schuelerId, sitzplatzId: sitz.id }),
        `${nameVon(schuelerId)} sitzt jetzt auf ${platzName(sitz)}.`,
      );
      return;
    }
    if (nutzlast.startsWith('sitzplatz:')) {
      const quelle = nutzlast.slice('sitzplatz:'.length);
      if (quelle === sitz.id) return;
      void speichere(
        tausche(zuordnungen, quelle, sitz.id),
        belegtNach.get(sitz.id) ? `Plätze getauscht mit ${platzName(sitz)}.` : `Auf ${platzName(sitz)} verschoben.`,
      );
    }
  };

  const dropAufAblage = (e: React.DragEvent) => {
    e.preventDefault();
    const nutzlast = e.dataTransfer.getData(DRAG_MIME);
    if (!nutzlast.startsWith('sitzplatz:')) return;
    const schuelerId = belegtNach.get(nutzlast.slice('sitzplatz:'.length));
    if (schuelerId) legeZurueck(schuelerId);
  };

  const ausgewaehlterSitzplatzId = auswahl?.art === 'sitzplatz' ? auswahl.sitzplatzId : null;

  return (
    <section aria-label="Schülerzuordnung">
      {/* Sichtbarer Fokus (WCAG 2.4.7) für die Bedienelemente dieses Bereichs. */}
      <style>{`
        .sitzplan-ziel:focus-visible { outline: 3px solid #dc2626; outline-offset: 2px; }
        .sitzplan-ziel { cursor: pointer; }
        .sitzplan-ziel[disabled] { cursor: not-allowed; opacity: 0.55; }
      `}</style>

      <h3>Schülerzuordnung</h3>

      {befunde.length > 0 && (
        <ul role="alert" style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
          {befunde.map((b) => (
            <li
              key={`${b.sitzplatzId}-${b.schuelerId}`}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #b45309',
                background: '#fffbeb',
                color: '#7c2d12',
                borderRadius: '6px',
                marginBottom: '0.5rem',
              }}
            >
              {b.meldung}
            </li>
          ))}
        </ul>
      )}

      {fehler && (
        <p role="alert" style={{ color: '#b91c1c' }}>
          {fehler}
        </p>
      )}

      <p role="status" aria-live="polite" style={{ color: '#374151', minHeight: '1.5rem' }}>
        {speichert ? 'Speichere …' : meldung}
      </p>

      <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
        Bedienung mit der Maus durch Ziehen und Ablegen. Ohne Maus vollständig mit der Tastatur:
        Schüler oder belegten Sitzplatz <strong>auswählen</strong>, dann den Zielplatz aktivieren —
        ein belegter Zielplatz führt den Tausch aus. &bdquo;Zurück in die Ablage&ldquo; legt den
        ausgewählten Schüler wieder ab.
      </p>

      <SitzplanCanvas
        breiteCm={geometrie.breiteCm}
        laengeCm={geometrie.laengeCm}
        rasterCm={geometrie.rasterCm}
        objekte={geometrie.objekte}
        sitzplaetze={geometrie.sitzplaetze}
        belegung={zuordnungen.map((z) => {
          const s = schuelerNach.get(z.schuelerId);
          return {
            sitzplatzId: z.sitzplatzId,
            initialen: s?.initialen ?? UNBEKANNT_INITIALEN,
            farbe: s?.farbe ?? UNBEKANNT_FARBE,
          };
        })}
        ausgewaehlterSitzplatzId={ausgewaehlterSitzplatzId}
        onSitzplatzKlick={(id) => {
          const sitz = geometrie.sitzplaetze.find((s) => s.id === id);
          if (sitz) aktiviereSitzplatz(sitz);
        }}
      />

      <h4>Sitzplätze</h4>
      <ul
        aria-label="Sitzplätze im Raum"
        style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}
      >
        {geometrie.sitzplaetze.map((sitz) => {
          const belegtVon = belegtNach.get(sitz.id);
          const person = belegtVon ? schuelerNach.get(belegtVon) : undefined;
          const ausgewaehlt = ausgewaehlterSitzplatzId === sitz.id;
          const beschriftung = belegtVon
            ? `${platzName(sitz)}: ${nameVon(belegtVon)}`
            : `${platzName(sitz)}: frei`;
          return (
            <li key={sitz.id}>
              <button
                type="button"
                className="sitzplan-ziel"
                disabled={speichert}
                aria-pressed={ausgewaehlt}
                aria-label={beschriftung}
                draggable={belegtVon !== undefined && !speichert}
                onDragStart={(e) => dragStart(e, `sitzplatz:${sitz.id}`)}
                onDragOver={erlaubeDrop}
                onDrop={(e) => dropAufSitzplatz(e, sitz)}
                onClick={() => aktiviereSitzplatz(sitz)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '9999px',
                  border: ausgewaehlt ? '2px solid #dc2626' : '1px solid #7c2d12',
                  background: belegtVon ? (person?.farbe ?? UNBEKANNT_FARBE) : '#ffffff',
                  color: belegtVon ? '#ffffff' : '#7c2d12',
                  fontSize: '0.875rem',
                }}
              >
                {beschriftung}
              </button>
            </li>
          );
        })}
      </ul>

      <h4>Ablage</h4>
      <div onDragOver={erlaubeDrop} onDrop={dropAufAblage}>
        <ul
          aria-label="Ablage: Schüler ohne Sitzplatz"
          style={{
            listStyle: 'none',
            padding: '0.75rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            minHeight: '3rem',
            border: '1px dashed #9ca3af',
            borderRadius: '6px',
          }}
        >
          {ablage.length === 0 && (
            <li style={{ color: '#6b7280' }}>Alle aktiven Schüler sitzen auf einem Sitzplatz.</li>
          )}
          {ablage.map((s) => {
            const ausgewaehlt = auswahl?.art === 'ablage' && auswahl.schuelerId === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className="sitzplan-ziel"
                  disabled={speichert}
                  aria-pressed={ausgewaehlt}
                  aria-label={`${s.name} auswählen und auf einen Sitzplatz setzen`}
                  draggable={!speichert}
                  onDragStart={(e) => dragStart(e, `schueler:${s.id}`)}
                  onClick={() => waehleAusAblage(s.id)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '9999px',
                    border: ausgewaehlt ? '2px solid #dc2626' : `1px solid ${s.farbe}`,
                    background: s.farbe,
                    color: '#ffffff',
                    fontSize: '0.875rem',
                  }}
                >
                  {s.initialen} · {s.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {ausgewaehlterSitzplatzId && belegtNach.get(ausgewaehlterSitzplatzId) && (
        <button
          type="button"
          className="sitzplan-ziel"
          disabled={speichert}
          onClick={() => legeZurueck(belegtNach.get(ausgewaehlterSitzplatzId)!)}
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #7c2d12',
            background: '#ffffff',
            color: '#7c2d12',
          }}
        >
          Zurück in die Ablage
        </button>
      )}
    </section>
  );
}
