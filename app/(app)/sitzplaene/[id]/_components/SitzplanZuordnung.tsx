'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { RaumObjektV1 } from '../../../../../src/domain/raum/objekte';
import type { SitzplatzV1 } from '../../../../../src/domain/raum/sitzplaetze';
import type { Zuordnung } from '../../../../../src/domain/sitzplan';
import type { ZuordnungBefund } from '../../../../../src/domain/sitzplan/zuordnung-commands';
import {
  START_MELDUNG,
  aktiviereSitzplatz,
  dragNutzlastSchueler,
  dragNutzlastSitzplatz,
  dropAufAblage,
  dropAufSitzplatz,
  legeZurueck,
  waehleAusAblage,
  type Auswahl,
  type Interaktion,
  type InteraktionsZustand,
} from './zuordnung-interaktion';

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

// Darstellung einer Zuordnung auf ein nicht mehr aktives Schülerprofil: Der
// Platz ist belegt, aber nicht auflösbar — er darf nicht wie ein freier Platz
// aussehen.
const UNBEKANNT_FARBE = '#9ca3af';
const UNBEKANNT_INITIALEN = '?';

/**
 * Schülerzuordnung im Sitzplan-Editor (M3 #57).
 *
 * Zwei gleichwertige Bedienwege auf denselben Entscheidungen: Drag-and-drop
 * (Ablage → freier Platz, Platz → Platz, Platz → belegter Platz als
 * definierter Tausch, Platz → Ablage) und — als hartes Kriterium, nicht als
 * Zugabe — Auswahl und Aktion über native Schaltflächen, damit der Editor
 * vollständig mit der Tastatur bedienbar bleibt (WCAG 2.1.1).
 *
 * Die Komponente ist bewusst eine dünne Schale: Was eine Bedienhandlung
 * bewirkt, entscheidet das framework-freie Modul `zuordnung-interaktion.ts`
 * und ist dort ohne DOM testbar. Hier bleiben nur Zustand, Netzwerkaufruf und
 * Darstellung.
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
  const [meldung, setMeldung] = useState(START_MELDUNG);
  const [fehler, setFehler] = useState('');
  const [speichert, setSpeichert] = useState(false);

  const schuelerNach = new Map(schueler.map((s) => [s.id, s]));
  const belegtNach = new Map(zuordnungen.map((z) => [z.sitzplatzId, z.schuelerId]));
  const sitzend = new Set(zuordnungen.map((z) => z.schuelerId));
  const ablage = schueler.filter((s) => !sitzend.has(s.id));

  const zustand: InteraktionsZustand = {
    zuordnungen,
    auswahl,
    schuelerNamen: new Map(schueler.map((s) => [s.id, s.name])),
    platzNamen: new Map(geometrie.sitzplaetze.map((s) => [s.id, s.bezeichnung ?? s.id])),
  };

  /**
   * Schreibt den vollständigen gewünschten Zustand. Schlägt das Speichern
   * fehl, wird auf den letzten bestätigten Stand zurückgesetzt — die
   * Oberfläche zeigt dann nie eine Zuordnung, die der Server nicht kennt.
   */
  const speichere = async (neu: Zuordnung[], erfolgsmeldung: string) => {
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

  /**
   * Führt aus, was das Interaktionsmodul entschieden hat. Während eines
   * laufenden Schreibvorgangs bleibt jede Bedienhandlung folgenlos — die
   * Schaltflächen tragen dafür `aria-disabled` statt `disabled`, damit der
   * Fokus beim Speichern nicht auf `<body>` zurückfällt (WCAG 2.4.3).
   */
  const fuehreAus = (interaktion: Interaktion) => {
    if (speichert) return;

    if (interaktion.art === 'speichern') {
      void speichere(interaktion.zuordnungen, interaktion.meldung);
      return;
    }
    if (interaktion.art === 'auswahl') {
      setAuswahl(interaktion.auswahl);
    }
    setMeldung(interaktion.meldung);
  };

  const erlaubeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const starteDrag = (e: React.DragEvent, nutzlast: string) => {
    e.dataTransfer.setData('text/plain', nutzlast);
    e.dataTransfer.effectAllowed = 'move';
  };

  const ausgewaehlterSitzplatzId = auswahl?.art === 'sitzplatz' ? auswahl.sitzplatzId : null;
  const ausgewaehlterInhaber = ausgewaehlterSitzplatzId ? belegtNach.get(ausgewaehlterSitzplatzId) : undefined;

  return (
    <section aria-label="Schülerzuordnung">
      {/* Sichtbarer Fokus (WCAG 2.4.7) für die Bedienelemente dieses Bereichs. */}
      <style>{`
        .sitzplan-ziel:focus-visible { outline: 3px solid #dc2626; outline-offset: 2px; }
        .sitzplan-ziel { cursor: pointer; }
        .sitzplan-ziel[aria-disabled="true"] { cursor: progress; opacity: 0.55; }
      `}</style>

      <h3>Schülerzuordnung</h3>

      {/* Befunde stehen bereits beim Laden im Markup und sind keine
          dynamische Warnung — `role="status"` meldet sie höflich an, ohne die
          Listensemantik der Einträge zu überschreiben. */}
      {befunde.length > 0 && (
        <div role="status" aria-label="Inkonsistenzen in diesem Sitzplan">
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
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
        </div>
      )}

      {/* Der Speicherfehler tritt dagegen dynamisch auf und rechtfertigt die
          assertive Rolle. */}
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
        ein belegter Zielplatz führt den Tausch aus. Ein Schüler aus der Ablage lässt sich nur auf
        einen freien Platz setzen. &bdquo;Zurück in die Ablage&ldquo; legt den ausgewählten Schüler
        wieder ab.
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
        onSitzplatzKlick={(id) => fuehreAus(aktiviereSitzplatz(zustand, id))}
      />

      <h4>Sitzplätze</h4>
      <ul
        aria-label="Sitzplätze im Raum"
        style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}
      >
        {geometrie.sitzplaetze.map((sitz) => {
          const inhaber = belegtNach.get(sitz.id);
          const person = inhaber ? schuelerNach.get(inhaber) : undefined;
          const ausgewaehlt = ausgewaehlterSitzplatzId === sitz.id;
          const platz = sitz.bezeichnung ?? sitz.id;
          const beschriftung = inhaber
            ? `${platz}: ${person?.name ?? 'nicht mehr aktives Schülerprofil'}`
            : `${platz}: frei`;
          return (
            <li key={sitz.id}>
              <button
                type="button"
                className="sitzplan-ziel"
                aria-disabled={speichert}
                aria-pressed={ausgewaehlt}
                aria-label={beschriftung}
                draggable={inhaber !== undefined && !speichert}
                onDragStart={(e) => starteDrag(e, dragNutzlastSitzplatz(sitz.id))}
                onDragOver={erlaubeDrop}
                onDrop={(e) => {
                  e.preventDefault();
                  fuehreAus(dropAufSitzplatz(zustand, e.dataTransfer.getData('text/plain'), sitz.id));
                }}
                onClick={() => fuehreAus(aktiviereSitzplatz(zustand, sitz.id))}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '9999px',
                  border: ausgewaehlt ? '2px solid #dc2626' : '1px solid #7c2d12',
                  background: inhaber ? (person?.farbe ?? UNBEKANNT_FARBE) : '#ffffff',
                  color: inhaber ? '#ffffff' : '#7c2d12',
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
      <div
        onDragOver={erlaubeDrop}
        onDrop={(e) => {
          e.preventDefault();
          fuehreAus(dropAufAblage(zustand, e.dataTransfer.getData('text/plain')));
        }}
      >
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
                  aria-disabled={speichert}
                  aria-pressed={ausgewaehlt}
                  aria-label={`${s.name} auswählen und auf einen freien Sitzplatz setzen`}
                  draggable={!speichert}
                  onDragStart={(e) => starteDrag(e, dragNutzlastSchueler(s.id))}
                  onClick={() => fuehreAus(waehleAusAblage(zustand, s.id))}
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

      {ausgewaehlterSitzplatzId && ausgewaehlterInhaber && (
        <button
          type="button"
          className="sitzplan-ziel"
          aria-disabled={speichert}
          onClick={() => fuehreAus(legeZurueck(zustand, ausgewaehlterSitzplatzId))}
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
