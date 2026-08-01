'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import type { RaumObjektV1 } from '../../../../../src/domain/raum/objekte';
import type { SitzplatzV1 } from '../../../../../src/domain/raum/sitzplaetze';
import type { Zuordnung } from '../../../../../src/domain/sitzplan';
import type { ZuordnungBefund } from '../../../../../src/domain/sitzplan/zuordnung-commands';
import { bestaetige, erzeugeHistorie, kannRedo, kannUndo, wendeAn } from '../../../../../src/domain/sitzplan/historie';
import HistorieLeiste from './HistorieLeiste';
import {
  beschreibeZiel,
  ermittlePlattform,
  ermittleTastaturBefehl,
  ermittleZuordnungsZustand,
  macheRueckgaengig,
  pruefePlanwechsel,
  stelleWiederHer,
  tastaturkuerzel,
  type HistorieAktion,
  type Plattform,
  type ZuordnungsHistorie,
} from './historie-bedienung';
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

// Die Plattform ändert sich zur Laufzeit nicht; der Speicher meldet deshalb nie
// eine Änderung. Alle drei Rückrufe sind modulweit stabil, wie es
// `useSyncExternalStore` verlangt.
const abonniereNichts = () => () => {};
const plattformImBrowser = (): Plattform => ermittlePlattform(navigator.userAgent);
const plattformAufDemServer = (): Plattform => 'sonstige';

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
 *
 * Undo/Redo und der sichtbare Änderungszustand (M3 #58) liegen ebenso außerhalb
 * der Komponente: Der Historienstapel ist reiner, nie persistierter
 * Clientzustand aus vollständigen Zuordnungslisten — kein Ereignisprotokoll
 * (ADR-0010).
 */
export default function SitzplanZuordnung({
  sitzplanId,
  geometrie,
  schueler,
  zuordnungen: initialeZuordnungen,
  befunde,
}: SitzplanZuordnungProps) {
  const [historie, setHistorie] = useState<ZuordnungsHistorie>(() => erzeugeHistorie(initialeZuordnungen));
  const [auswahl, setAuswahl] = useState<Auswahl>(null);
  const [meldung, setMeldung] = useState(START_MELDUNG);
  const [fehler, setFehler] = useState('');
  const [speichert, setSpeichert] = useState(false);

  // Wechselt die Seite auf einen anderen Plan, wird die Historie verworfen —
  // ihre Stapel bezögen sich sonst auf ein anderes Dokument. Bewusst als
  // Zustandskorrektur während des Renderns statt als Effekt, damit nie ein
  // Zwischenbild mit fremder Historie erscheint. Die Entscheidung selbst liegt
  // im framework-freien Modul und ist dort geprüft.
  const [geladenerPlan, setGeladenerPlan] = useState(sitzplanId);
  const wechsel = pruefePlanwechsel(historie, geladenerPlan, sitzplanId, initialeZuordnungen);
  if (wechsel.art === 'zuruecksetzen') {
    setGeladenerPlan(sitzplanId);
    setHistorie(wechsel.historie);
    setAuswahl(null);
    setMeldung(START_MELDUNG);
    setFehler('');
    // Ein noch laufender Schreibvorgang gehört zum vorigen Plan; seine Antwort
    // wird verworfen (siehe `gehoertZumGeladenenPlan`). Die Bedienung des neuen
    // Plans darf deshalb nicht blockiert bleiben.
    setSpeichert(false);
  }

  // Welcher Plan gerade angezeigt wird — gelesen von asynchronen Antworten,
  // die einen Planwechsel überdauert haben könnten.
  const geladenerPlanRef = useRef(sitzplanId);
  useEffect(() => {
    geladenerPlanRef.current = sitzplanId;
  }, [sitzplanId]);

  const zuordnungen = historie.gegenwart;
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
   * Schreibt die Gegenwart des neuen Historienwerts. Schlägt das Speichern
   * fehl, wird die vollständige vorherige Historie wiederhergestellt — die
   * Oberfläche zeigt dann nie eine Zuordnung, die der Server nicht kennt, und
   * ein misslungener Schritt bleibt weder rückgängig- noch wiederherstellbar.
   * Erfolg verschiebt nur die Vergleichsbasis; die Stapel bleiben erhalten,
   * damit Undo nach dem Speichern weiterhin möglich ist.
   *
   * Jede Zustandsänderung nach dem `await` ist an den Plan gebunden, für den
   * geschrieben wurde. Sonst schriebe eine verspätete Antwort — besonders der
   * Rollback auf `vorher` — die Historie des vorigen Plans in die Ansicht des
   * inzwischen geladenen.
   */
  const speichere = useCallback(
    async (vorher: ZuordnungsHistorie, naechste: ZuordnungsHistorie, erfolgsmeldung: string) => {
      const geschriebenerPlan = sitzplanId;
      const gehoertZumGeladenenPlan = () => geladenerPlanRef.current === geschriebenerPlan;

      setHistorie(naechste);
      setAuswahl(null);
      setFehler('');
      setSpeichert(true);

      try {
        const res = await fetch(`/api/sitzplaene/${geschriebenerPlan}/zuordnungen`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zuordnungen: naechste.gegenwart }),
        });

        if (res.ok) {
          const sitzplan = await res.json();
          if (!gehoertZumGeladenenPlan()) return;
          setHistorie((h) => bestaetige(h, sitzplan.canvasDocument.zuordnungen));
          setMeldung(erfolgsmeldung);
        } else {
          const data = await res.json().catch(() => ({}));
          if (!gehoertZumGeladenenPlan()) return;
          setHistorie(vorher);
          setFehler(data.error?.message || 'Speichern fehlgeschlagen.');
          setMeldung('Änderung verworfen.');
        }
      } catch {
        if (!gehoertZumGeladenenPlan()) return;
        setHistorie(vorher);
        setFehler('Speichern fehlgeschlagen.');
        setMeldung('Änderung verworfen.');
      } finally {
        if (gehoertZumGeladenenPlan()) setSpeichert(false);
      }
    },
    [sitzplanId],
  );

  /**
   * Führt aus, was das Interaktionsmodul entschieden hat. Während eines
   * laufenden Schreibvorgangs bleibt jede Bedienhandlung folgenlos — die
   * Schaltflächen tragen dafür `aria-disabled` statt `disabled`, damit der
   * Fokus beim Speichern nicht auf `<body>` zurückfällt (WCAG 2.4.3).
   */
  const fuehreAus = (interaktion: Interaktion) => {
    if (speichert) return;

    if (interaktion.art === 'speichern') {
      void speichere(historie, wendeAn(historie, interaktion.zuordnungen), interaktion.meldung);
      return;
    }
    if (interaktion.art === 'auswahl') {
      setAuswahl(interaktion.auswahl);
    }
    setMeldung(interaktion.meldung);
  };

  /** Führt aus, was die Historien-Bedienlogik entschieden hat. */
  const fuehreHistorieAus = useCallback(
    (aktion: HistorieAktion) => {
      if (speichert) return;

      if (aktion.art === 'anwenden') {
        void speichere(historie, aktion.historie, aktion.meldung);
        return;
      }
      setMeldung(aktion.meldung);
    },
    [historie, speichert, speichere],
  );

  // Die Plattform ist erst im Browser bekannt. `useSyncExternalStore` liefert
  // auf dem Server bewusst `sonstige` und nach der Hydration den tatsächlichen
  // Wert — damit stimmt das erste Markup überein und die angesagten Kürzel
  // passen anschließend zur Plattform.
  const plattform = useSyncExternalStore(abonniereNichts, plattformImBrowser, plattformAufDemServer);

  // Tastaturkürzel für Rückgängig und Wiederherstellen. Die Entscheidung, ob
  // ein Ereignis überhaupt ein Historienbefehl ist — Plattformmodifikator,
  // Fokus in einer Texteingabe wie dem Namensfeld des Plans — liegt samt der
  // Abbildung des Ereignisziels im framework-freien Modul und ist dort ohne DOM
  // geprüft.
  useEffect(() => {
    const beiTaste = (e: KeyboardEvent) => {
      const befehl = ermittleTastaturBefehl(
        {
          key: e.key,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          ziel: beschreibeZiel(e.target),
        },
        plattform,
      );

      if (!befehl) return;
      e.preventDefault();
      fuehreHistorieAus(befehl === 'rueckgaengig' ? macheRueckgaengig(historie) : stelleWiederHer(historie));
    };

    document.addEventListener('keydown', beiTaste);
    return () => document.removeEventListener('keydown', beiTaste);
  }, [historie, fuehreHistorieAus, plattform]);

  const erlaubeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const starteDrag = (e: React.DragEvent, nutzlast: string) => {
    e.dataTransfer.setData('text/plain', nutzlast);
    e.dataTransfer.effectAllowed = 'move';
  };

  const aenderungsZustand = ermittleZuordnungsZustand(historie, { speichert, fehler: fehler !== '' });
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

      <HistorieLeiste
        zustand={aenderungsZustand}
        kannZurueck={kannUndo(historie)}
        kannVor={kannRedo(historie)}
        speichert={speichert}
        kuerzel={tastaturkuerzel(plattform)}
        onZurueck={() => fuehreHistorieAus(macheRueckgaengig(historie))}
        onVor={() => fuehreHistorieAus(stelleWiederHer(historie))}
      />

      <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
        Bedienung mit der Maus durch Ziehen und Ablegen. Ohne Maus vollständig mit der Tastatur:
        Schüler oder belegten Sitzplatz <strong>auswählen</strong>, dann den Zielplatz aktivieren —
        ein belegter Zielplatz führt den Tausch aus. Ein Schüler aus der Ablage lässt sich nur auf
        einen freien Platz setzen. &bdquo;Zurück in die Ablage&ldquo; legt den ausgewählten Schüler
        wieder ab. Zuordnungsschritte lassen sich rückgängig machen und wiederherstellen — über die
        Schaltflächen oder mit <kbd>Strg</kbd>+<kbd>Z</kbd> beziehungsweise <kbd>Cmd</kbd>+<kbd>Z</kbd>
        (mit <kbd>Umschalt</kbd> für Wiederherstellen). Im Namensfeld des Plans bleibt das Kürzel der
        Texteingabe vorbehalten.
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
