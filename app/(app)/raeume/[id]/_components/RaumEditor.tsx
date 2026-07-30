'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Button from '../../../../../src/ui/Button';
import { MIN_RASTER_CM } from '../../../../../src/domain/raum/koordinaten';
import { RAUM_OBJEKT_TYPEN, STANDARD_OBJEKTE } from '../../../../../src/domain/raum/objekte';
import type { RaumObjektTyp, RaumObjektV1 } from '../../../../../src/domain/raum/objekte';

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
  };
}

// Editor-Shell für M2 #49–#51: Raumdaten anzeigen, Maße/Raster pflegen und
// Standardobjekte aus der Möbelpalette einfügen. Objektinteraktion (#52):
// Auswahl per Maus/Tastatur, Drag-and-drop mit serverseitigem Rasterfang und
// Rollback auf den letzten bestätigten Stand bei Speicherfehlern.
// Objektaktionen (#53) folgen in einem eigenen Slice.
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

  return (
    <div>
      <RaumCanvas
        key={canvasSchluessel}
        breiteCm={vorschau.breiteCm}
        laengeCm={vorschau.laengeCm}
        rasterCm={vorschau.rasterCm}
        objekte={raum.objekte}
        ausgewaehltId={ausgewaehltId}
        onAuswaehlen={setAusgewaehltId}
        onBewegt={dragAktiv ? handleBewegt : undefined}
      />
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
                  aria-pressed={o.id === ausgewaehltId}
                  onClick={() => setAusgewaehltId(o.id)}
                >
                  {STANDARD_OBJEKTE[o.typ].label} ({Math.round(o.x_cm)}, {Math.round(o.y_cm)})
                </Button>
              </li>
            ))}
          </ul>
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
