'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from '../../../../src/ui/Container';
import Button from '../../../../src/ui/Button';

export default function NeueKlassePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [notizen, setNotizen] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/klassen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, notizen: notizen || undefined }),
      });

      if (res.ok) {
        router.push('/klassen');
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

  return (
    <Container>
      <h2>Neue Klasse anlegen</h2>
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
            disabled={isSubmitting}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div>
          <label htmlFor="notizen" style={{ display: 'block', marginBottom: '0.25rem' }}>Notizen (optional)</label>
          <textarea
            id="notizen"
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            disabled={isSubmitting}
            style={{ width: '100%', padding: '0.5rem', minHeight: '100px' }}
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Speichere...' : 'Speichern'}
        </Button>
      </form>
    </Container>
  );
}
