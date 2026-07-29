'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from '../../../../src/ui/Container';
import Button from '../../../../src/ui/Button';

export default function NeueRaumvorlagePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [breiteCm, setBreiteCm] = useState('');
  const [laengeCm, setLaengeCm] = useState('');
  const [rasterCm, setRasterCm] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/raeume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          breiteCm: Number(breiteCm),
          laengeCm: Number(laengeCm),
          rasterCm: Number(rasterCm),
        }),
      });

      if (res.ok) {
        router.push('/raeume');
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

  const fieldStyle = { width: '100%', padding: '0.5rem' } as const;
  const labelStyle = { display: 'block', marginBottom: '0.25rem' } as const;

  return (
    <Container>
      <h2>Neue Raumvorlage anlegen</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Speichere...' : 'Speichern'}
        </Button>
      </form>
    </Container>
  );
}
