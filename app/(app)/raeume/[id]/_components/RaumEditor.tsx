'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Button from '../../../../../src/ui/Button';
import { MIN_RASTER_CM } from '../../../../../src/domain/raum/koordinaten';
import { RAUM_OBJEKT_TYPEN, STANDARD_OBJEKTE } from '../../../../../src/domain/raum/objekte';
import type { RaumObjektTyp, RaumObjektV1 } from '../../../../../src/domain/raum/objekte';
import { TASTATURKUERZEL, aktionFuerTaste, istEingabefeld } from './tastatur';
import type { SitzplatzV1 } from '../../../../../src/domain/raum/sitzplaetze';
import { istTisch } from '../../../../../src/domain/raum/sitzplaetze';

// react-konva braucht den Browser — bewusst ohne SSR geladen (Ladezustand sichtbar).
const RaumCanvas = dynamic(() => import('./RaumCanvas'), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-label="Editorfläche lädt"
      style={{
        marginBottom: '2rem',
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

export interface RaumEditorProps {
  raum: {
    id: string;
    name: string;
    breiteCm: number;
    laengeCm: number;
    rasterCm: number;
    dokumentVersion: number;
    objekte: RaumObjektV1[];
    sitzplaetze: SitzplatzV1[];
  };
}

// Editor-Shell für M2 #49–#53: Raumdaten anzeigen, Maße/Raster pflegen,
// Standardobjekte aus der Möbelpalette einfügen, Auswahl und Drag-and-drop
// mit serverseitigem Rasterfang sowie Objektaktionen (Drehen, Duplizieren,
// Löschen) über Toolbar und dokumentierte Tastaturkürzel.
export default function RaumEditor({ raum }: RaumEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(raum.name);
  const [breiteCm, setBreiteCm] = useState(String(raum.breiteCm));
  const [laengeCm, setLaengeCm] = useState(String(raum.laengeCm));
  const [rasterCm, setRasterCm] = useState(String(raum.rasterCm));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ausgewaehltId, setAusgewaehltId] = useState<string | null>(null);
  // Remount-Schlüssel: nach einem fehlgeschlagenen Speichern wird der Canvas
  // neu aufgesetzt und zeigt damit wieder den letzten bestätigten Stand.
  const [canvasSchluessel, setCanvasSchluessel] = useState(0);
  // Editor-Wurzel für die Fokusbindung der Ein-Zeichen-Shortcuts (WCAG 2.1.4).
  const editorRef = useRef<HTMLDivElement>(null);
  // Fokussierbarer Canvas-Bereich: nach einer Auswahl per Maus liegt der
  // Fokus sonst auf <body> — die Kürzel R/D wären dann tot.
  const canvasBereichRef = useRef<HTMLDivElement>(null);

  // Auswahl setzen und den Canvas-Bereich fokussieren, damit die
  // fokusgebundenen Tastaturkürzel (R/D) direkt danach greifen.
  const handleAuswaehlen = (id: string | null) => {
    setAusgewaehltId(id);
    if (id) {
      canvasBereichRef.current?.focus({ preventScroll: true });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/raeume/${raum.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          breiteCm: Number(breiteCm),
          laengeCm: Number(laengeCm),
          rasterCm: Number(rasterCm),
        }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error?.message || 'Ein Fehler ist aufgetreten.');
      }
    } catch {
      setError('Ein Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isSubmitting) return;
    if (!window.confirm('Raumvorlage wirklich löschen?')) return;

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/raeume/${raum.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/raeume');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.message || 'Ein Fehler ist aufgetreten.');
        setIsSubmitting(false);
      }
    } catch {
      setError('Ein Fehler ist aufgetreten.');
      setIsSubmitting(false);
    }
  };

  const handleAddObjekt = async (typ: RaumObjektTyp) => {
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/raeume/${raum.id}/objekte`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typ }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.message || 'Ein Fehler ist aufgetreten.');
      }
    } catch {
      setError('Ein Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Speichert die Zielposition nach abgeschlossener Drag-Interaktion.
  // Scheitert das Speichern, bleibt der letzte bestätigte Dokumentstand
  // aktiv: Fehlermeldung + Canvas-Remount auf den Props-Zustand.
  const handleBewegt = async (objektId: string, xCm: number, yCm: number) => {
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/raeume/${raum.id}/objekte/${objektId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x_cm: xCm, y_cm: yCm }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.message || 'Position konnte nicht gespeichert werden.');
        setCanvasSchluessel((k) => k + 1); // Rollback auf bestätigten Stand
      }
    } catch {
      setError('Position konnte nicht gespeichert werden.');
      setCanvasSchluessel((k) => k + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Objektaktionen (M2 #53): Drehen, Duplizieren und Löschen des aktuell
  // ausgewählten Objekts — über Toolbar und Tastaturkürzel erreichbar.
  const handleObjektAktion = async (aktion: 'rotieren' | 'duplizieren' | 'loeschen') => {
    if (isSubmitting || !ausgewaehltId) return;

    if (aktion === 'loeschen' && !window.confirm('Ausgewähltes Objekt wirklich löschen?')) return;

    setError('');
    setIsSubmitting(true);

    try {
      const res =
        aktion === 'loeschen'
          ? await fetch(`/api/raeume/${raum.id}/objekte/${ausgewaehltId}`, { method: 'DELETE' })
          : await fetch(`/api/raeume/${raum.id}/objekte/${ausgewaehltId}/aktionen`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ aktion }),
            });

      if (res.ok) {
        if (aktion === 'loeschen') {
          setAusgewaehltId(null);
        }
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.message || 'Aktion konnte nicht ausgeführt werden.');
      }
    } catch {
      setError('Aktion konnte nicht ausgeführt werden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tastaturkürzel (R/D/Entf) gelten nur bei aktiver Auswahl und niemals
  // in Eingabefeldern. Browser-/Systemkürzel mit Modifiern (z. B. Cmd+R,
  // Ctrl+D) bleiben unangetastet. Ein-Zeichen-Shortcuts (R/D) sind
  // fokusgebunden (WCAG 2.1.4): Sie feuern nur, wenn der Fokus innerhalb
  // des Editors liegt — Entf/Backspace sind davon ausgenommen.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!ausgewaehltId || istEingabefeld(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const aktion = aktionFuerTaste(e.key);
      if (!aktion) return;
      if (aktion !== 'loeschen' && !editorRef.current?.contains(document.activeElement)) return;
      e.preventDefault();
      void handleObjektAktion(aktion);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ausgewaehltId, isSubmitting]);

  const fieldStyle = { width: '100%', padding: '0.5rem' } as const;
  const labelStyle = { display: 'block', marginBottom: '0.25rem' } as const;

  // Live-Vorschau: gültige Formularwerte steuern den Canvas sofort,
  // ungültige Eingaben fallen auf den gespeicherten Stand zurück.
  const parsedBreite = Number(breiteCm);
  const parsedLaenge = Number(laengeCm);
  const parsedRaster = Number(rasterCm);
  const vorschau = {
    breiteCm: parsedBreite > 0 ? parsedBreite : raum.breiteCm,
    laengeCm: parsedLaenge > 0 ? parsedLaenge : raum.laengeCm,
    rasterCm: parsedRaster >= MIN_RASTER_CM ? parsedRaster : raum.rasterCm,
  };

  // Drag ist nur sinnvoll, wenn das sichtbare Raster/Maß dem persistierten
  // Dokument entspricht (sonst rastet der Server auf andere Werte ein) und
  // kein Speichervorgang läuft — sonst würde eine Node-Bewegung ohne
  // Request verloren gehen.
  const vorschauUngespeichert =
    vorschau.breiteCm !== raum.breiteCm ||
    vorschau.laengeCm !== raum.laengeCm ||
    vorschau.rasterCm !== raum.rasterCm;
  const dragAktiv = !isSubmitting && !vorschauUngespeichert;

  // Aktuell ausgewähltes Objekt — nach einem Refresh kann die ID veraltet
  // sein, dann wird keine Toolbar angezeigt.
  const ausgewaehltObjekt = ausgewaehltId ? raum.objekte.find((o) => o.id === ausgewaehltId) : undefined;

  return (
    <div ref={editorRef}>
      <div
        ref={canvasBereichRef}
        tabIndex={-1}
        aria-label="Raum-Canvas — Auswahl eines Objekts aktiviert die Tastaturkürzel R/D/Entf"
        style={{ outline: 'none' }}
      >
        <RaumCanvas
          key={canvasSchluessel}
          breiteCm={vorschau.breiteCm}
          laengeCm={vorschau.laengeCm}
          rasterCm={vorschau.rasterCm}
          objekte={raum.objekte}
          sitzplaetze={raum.sitzplaetze}
          ausgewaehltId={ausgewaehltId}
          onAuswaehlen={handleAuswaehlen}
          onBewegt={dragAktiv ? handleBewegt : undefined}
        />
      </div>
      {vorschauUngespeichert && (
        <p role="note" style={{ color: '#92400e', marginTop: '-1rem', marginBottom: '2rem' }}>
          Ungespeicherte Maß-/Rasteränderungen — Verschieben ist erst nach dem Speichern möglich.
        </p>
      )}

      <h3>Möbelpalette</h3>
      <div
        role="group"
        aria-label="Standardobjekte hinzufügen"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}
      >
        {RAUM_OBJEKT_TYPEN.map((typ) => (
          <Button
            key={typ}
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => handleAddObjekt(typ)}
          >
            + {STANDARD_OBJEKTE[typ].label}
          </Button>
        ))}
      </div>

      {raum.objekte.length > 0 && (
        <>
          <h3>Objekte im Raum</h3>
          <ul
            aria-label="Objektliste — Auswahl per Tastatur möglich"
            style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}
          >
            {raum.objekte.map((o) => (
              <li key={o.id}>
                <Button
                  type="button"
                  variant={o.id === ausgewaehltId ? 'primary' : 'ghost'}
                  ariaPressed={o.id === ausgewaehltId}
                  onClick={() => setAusgewaehltId(o.id)}
                >
                  {STANDARD_OBJEKTE[o.typ].label} ({Math.round(o.x_cm)}, {Math.round(o.y_cm)})
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      {ausgewaehltObjekt && (
        <>
          <h3>Ausgewähltes Objekt: {STANDARD_OBJEKTE[ausgewaehltObjekt.typ].label}</h3>
          <div
            role="toolbar"
            aria-label="Aktionen für das ausgewählte Objekt"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}
          >
            <Button
              type="button"
              variant="soft"
              disabled={isSubmitting}
              ariaLabel="Objekt um 90 Grad drehen (Taste R)"
              onClick={() => handleObjektAktion('rotieren')}
            >
              ⟳ 90° drehen
            </Button>
            <Button
              type="button"
              variant="soft"
              disabled={isSubmitting}
              ariaLabel="Objekt duplizieren (Taste D)"
              onClick={() => handleObjektAktion('duplizieren')}
            >
              ⧉ Duplizieren
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              ariaLabel="Objekt löschen (Taste Entf)"
              onClick={() => handleObjektAktion('loeschen')}
            >
              ✕ Löschen
            </Button>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: 0, marginBottom: '2rem' }}>
            Tastaturkürzel:{' '}
            {TASTATURKUERZEL.map((k, i) => (
              <span key={k.aktion}>
                {i > 0 && ' · '}
                <kbd>{k.tasten}</kbd> {k.beschreibung}
              </span>
            ))}
          </p>
          {/* Zugängliche Sitzplatzliste (M2 #54): Die Konva-Marker selbst
              sind nicht DOM-zugänglich — Bezeichnung und stabile ID stehen
              hier als Text zur Verfügung. */}
          {istTisch(ausgewaehltObjekt.typ) && (
            <ul
              aria-label={`Sitzplätze an ${STANDARD_OBJEKTE[ausgewaehltObjekt.typ].label}`}
              style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '0.5rem', marginTop: '-1rem', marginBottom: '2rem' }}
            >
              {raum.sitzplaetze
                .filter((s) => s.objektId === ausgewaehltObjekt.id)
                .map((s) => (
                  <li
                    key={s.id}
                    style={{
                      padding: '0.25rem 0.75rem',
                      border: '1px solid #7c2d12',
                      borderRadius: '9999px',
                      background: '#fff7ed',
                      color: '#7c2d12',
                      fontSize: '0.875rem',
                    }}
                  >
                    {s.bezeichnung ?? s.id}
                  </li>
                ))}
            </ul>
          )}
        </>
      )}

      <h3>Raumdaten bearbeiten</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <div>
          <label htmlFor="name" style={labelStyle}>Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isSubmitting}
            style={fieldStyle}
          />
        </div>
        <div>
          <label htmlFor="breiteCm" style={labelStyle}>Breite (cm)</label>
          <input
            id="breiteCm"
            type="number"
            min="1"
            step="any"
            value={breiteCm}
            onChange={(e) => setBreiteCm(e.target.value)}
            required
            disabled={isSubmitting}
            style={fieldStyle}
          />
        </div>
        <div>
          <label htmlFor="laengeCm" style={labelStyle}>Länge (cm)</label>
          <input
            id="laengeCm"
            type="number"
            min="1"
            step="any"
            value={laengeCm}
            onChange={(e) => setLaengeCm(e.target.value)}
            required
            disabled={isSubmitting}
            style={fieldStyle}
          />
        </div>
        <div>
          <label htmlFor="rasterCm" style={labelStyle}>Raster (cm)</label>
          <input
            id="rasterCm"
            type="number"
            min="1"
            step="any"
            value={rasterCm}
            onChange={(e) => setRasterCm(e.target.value)}
            required
            disabled={isSubmitting}
            style={fieldStyle}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Speichere...' : 'Speichern'}
          </Button>
          <Button type="button" variant="ghost" onClick={handleDelete} disabled={isSubmitting}>
            Löschen
          </Button>
        </div>
      </form>
    </div>
  );
}
