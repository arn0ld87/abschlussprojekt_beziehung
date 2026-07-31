'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../../../src/ui/Button';

export interface SitzplanVerwaltungProps {
  id: string;
  name: string;
}

/**
 * Editor-Shell-Aktionen des Sitzplans (M3 #56): Umbenennen und Soft-Delete.
 * Der Canvas des Sitzplan-Editors folgt in einem eigenen Slice.
 */
export default function SitzplanVerwaltung({ id, name: initialName }: SitzplanVerwaltungProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const [hinweis, setHinweis] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isBusy = isSubmitting || isDeleting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    setError('');
    setHinweis('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/sitzplaene/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const sitzplan = await res.json();
        setName(sitzplan.name);
        setHinweis('Sitzplan umbenannt.');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error?.message || 'Umbenennen fehlgeschlagen.');
      }
    } catch {
      setError('Umbenennen fehlgeschlagen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isBusy) return;
    if (!confirm('Diesen Sitzplan wirklich löschen?')) return;

    setError('');
    setHinweis('');
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/sitzplaene/${id}`, { method: 'DELETE' });

      if (res.ok) {
        router.push('/sitzplaene');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error?.message || 'Löschen fehlgeschlagen.');
      }
    } catch {
      setError('Löschen fehlgeschlagen.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section>
      <h3>Plan verwalten</h3>
      {error && <p style={{ color: 'red' }} role="alert">{error}</p>}
      {hinweis && <p style={{ color: '#166534' }} role="status">{hinweis}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <div>
          <label htmlFor="planName" style={{ display: 'block', marginBottom: '0.25rem' }}>Name</label>
          <input
            id="planName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isBusy}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button type="submit" disabled={isBusy}>
            {isSubmitting ? 'Speichere...' : 'Umbenennen'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={isBusy}
            style={{ backgroundColor: '#ffcccc' }}
          >
            {isDeleting ? 'Lösche...' : 'Löschen'}
          </Button>
        </div>
      </form>
    </section>
  );
}
