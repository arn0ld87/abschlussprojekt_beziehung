'use client';

import { useState } from 'react';
import Button from '../../../../../src/ui/Button';
import { SchuelerData } from './SchuelerListe';
import { FotoUploader } from './FotoUploader';

interface Props {
  klasseId: string;
  schueler: SchuelerData | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function SchuelerFormular({ klasseId, schueler, onClose, onSaved }: Props) {
  const [name, setName] = useState(schueler?.name || '');
  const [initialen, setInitialen] = useState(schueler?.initialen || '');
  const [farbe, setFarbe] = useState(schueler?.farbe || '#4F46E5');
  const [lernstand, setLernstand] = useState(schueler?.lernstand || '');
  const [verhalten, setVerhalten] = useState(schueler?.verhalten || '');
  const [freitextnotizen, setFreitextnotizen] = useState(schueler?.freitextnotizen || '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      initialen: initialen.trim() || undefined,
      farbe,
      lernstand: lernstand.trim() || null,
      verhalten: verhalten.trim() || null,
      freitextnotizen: freitextnotizen.trim() || null,
    };

    try {
      const url = schueler
        ? `/api/klassen/${klasseId}/schueler/${schueler.id}`
        : `/api/klassen/${klasseId}/schueler`;
      const method = schueler ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || 'Fehler beim Speichern.');
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        }}
      >
        <h3>{schueler ? 'Schülerprofil bearbeiten' : 'Neuen Schüler anlegen'}</h3>
        {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}

        {schueler && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <FotoUploader
              klasseId={klasseId}
              schuelerId={schueler.id}
              fotoUrl={`/api/klassen/${klasseId}/schueler/${schueler.id}/foto`}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Max Mustermann"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Initialen</label>
              <input
                type="text"
                value={initialen}
                onChange={(e) => setInitialen(e.target.value)}
                placeholder="z. B. MM (automatisch wenn leer)"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Farbe</label>
              <input
                type="color"
                value={farbe}
                onChange={(e) => setFarbe(e.target.value)}
                style={{ width: '100%', height: '38px', padding: '0.2rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Lernstand</label>
            <input
              type="text"
              value={lernstand}
              onChange={(e) => setLernstand(e.target.value)}
              placeholder="z. B. Stark in Mathe, braucht Hilfe in Deutsch"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Verhalten</label>
            <input
              type="text"
              value={verhalten}
              onChange={(e) => setVerhalten(e.target.value)}
              placeholder="z. B. Ruhig, leicht ablenkbar"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Freitextnotizen</label>
            <textarea
              rows={3}
              value={freitextnotizen}
              onChange={(e) => setFreitextnotizen(e.target.value)}
              placeholder="Zusätzliche Anmerkungen..."
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Abbrechen
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Speichern...' : 'Speichern'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
