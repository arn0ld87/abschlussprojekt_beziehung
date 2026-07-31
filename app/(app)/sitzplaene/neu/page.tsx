'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from '../../../../src/ui/Container';
import Button from '../../../../src/ui/Button';

interface Auswahleintrag {
  id: string;
  name: string;
}

export default function NeuerSitzplanPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [klasseId, setKlasseId] = useState('');
  const [raumId, setRaumId] = useState('');
  const [klassen, setKlassen] = useState<Auswahleintrag[]>([]);
  const [raeume, setRaeume] = useState<Auswahleintrag[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Beide Endpunkte liefern ausschließlich eigene, nicht gelöschte Einträge —
  // die Auswahl kann daher keine fremde Quelle anbieten.
  useEffect(() => {
    let abgebrochen = false;

    Promise.all([
      fetch('/api/klassen').then((res) => (res.ok ? res.json() : Promise.reject(new Error('klassen')))),
      fetch('/api/raeume').then((res) => (res.ok ? res.json() : Promise.reject(new Error('raeume')))),
    ])
      .then(([klassenDaten, raumDaten]: [Auswahleintrag[], Auswahleintrag[]]) => {
        if (abgebrochen) return;
        setKlassen(klassenDaten);
        setRaeume(raumDaten);
        setIsLoading(false);
      })
      .catch(() => {
        if (abgebrochen) return;
        setError('Klassen und Raumvorlagen konnten nicht geladen werden.');
        setIsLoading(false);
      });

    return () => {
      abgebrochen = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/sitzplaene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, klasseId, raumId }),
      });

      if (res.ok) {
        const sitzplan = await res.json();
        router.push(`/sitzplaene/${sitzplan.id}`);
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
  const isBusy = isLoading || isSubmitting;

  return (
    <Container>
      <h2>Neuen Sitzplan anlegen</h2>
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
            disabled={isBusy}
            style={fieldStyle}
          />
        </div>
        <div>
          <label htmlFor="klasseId" style={labelStyle}>Klasse</label>
          <select
            id="klasseId"
            value={klasseId}
            onChange={(e) => setKlasseId(e.target.value)}
            required
            disabled={isBusy}
            style={fieldStyle}
          >
            <option value="">Bitte Klasse wählen</option>
            {klassen.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="raumId" style={labelStyle}>Raumvorlage</label>
          <select
            id="raumId"
            value={raumId}
            onChange={(e) => setRaumId(e.target.value)}
            required
            disabled={isBusy}
            style={fieldStyle}
          >
            <option value="">Bitte Raumvorlage wählen</option>
            {raeume.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <p style={{ margin: 0, color: '#666' }}>
          Die Raumgeometrie wird beim Anlegen in den Plan kopiert. Spätere Änderungen der Raumvorlage
          verändern diesen Sitzplan nicht mehr.
        </p>
        <Button type="submit" disabled={isBusy}>
          {isSubmitting ? 'Speichere...' : 'Sitzplan anlegen'}
        </Button>
      </form>
    </Container>
  );
}
