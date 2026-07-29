'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Container from '../../../../../src/ui/Container';
import Button from '../../../../../src/ui/Button';

export default function EditKlassePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [name, setName] = useState('');
  const [notizen, setNotizen] = useState('');
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/klassen/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        setName(data.name);
        setNotizen(data.notizen || '');
        setLoading(false);
      })
      .catch(() => {
        setFetchError(true);
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isDeleting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/klassen/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, notizen: notizen || null }),
      });

      if (res.ok) {
        router.push(`/klassen/${id}`);
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
    if (isSubmitting || isDeleting) return;
    if (!confirm('Wirklich löschen?')) return;

    setError('');
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/klassen/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/klassen');
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

  if (loading) return <Container>Lade...</Container>;

  if (fetchError) {
    return (
      <Container>
        <h2>Fehler beim Laden</h2>
        <p>Klasse konnte nicht geladen werden.</p>
        <Button type="button" variant="ghost" onClick={() => router.push('/klassen')}>
          Zurück zur Übersicht
        </Button>
      </Container>
    );
  }

  const isBusy = isSubmitting || isDeleting;

  return (
    <Container>
      <h2>Klasse bearbeiten</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '0.25rem' }}>Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isBusy}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div>
          <label htmlFor="notizen" style={{ display: 'block', marginBottom: '0.25rem' }}>Notizen (optional)</label>
          <textarea
            id="notizen"
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            disabled={isBusy}
            style={{ width: '100%', padding: '0.5rem', minHeight: '100px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button type="submit" disabled={isBusy}>
            {isSubmitting ? 'Speichere...' : 'Speichern'}
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
    </Container>
  );
}
