'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../../../src/ui/Button';

export interface RaumEditorProps {
  raum: {
    id: string;
    name: string;
    breiteCm: number;
    laengeCm: number;
    rasterCm: number;
    dokumentVersion: number;
  };
}

// Editor-Shell für M2 #49: Raumdaten anzeigen und Maße/Raster pflegen.
// Die Konva-Editorfläche folgt mit #50, Möbel mit #51.
export default function RaumEditor({ raum }: RaumEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(raum.name);
  const [breiteCm, setBreiteCm] = useState(String(raum.breiteCm));
  const [laengeCm, setLaengeCm] = useState(String(raum.laengeCm));
  const [rasterCm, setRasterCm] = useState(String(raum.rasterCm));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const fieldStyle = { width: '100%', padding: '0.5rem' } as const;
  const labelStyle = { display: 'block', marginBottom: '0.25rem' } as const;

  return (
    <div>
      <section
        aria-label="Editorfläche"
        style={{
          marginBottom: '2rem',
          padding: '2rem',
          border: '1px dashed #9ca3af',
          borderRadius: '6px',
          backgroundColor: '#f9fafb',
          color: '#4b5563',
          textAlign: 'center',
        }}
      >
        Editorfläche ({raum.breiteCm} × {raum.laengeCm} cm, Raster {raum.rasterCm} cm) — folgt mit M2 #50.
      </section>

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
