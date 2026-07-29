'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '../../../../../src/ui/Button';
import { SchuelerData } from './SchuelerListe';

interface SitzregelItem {
  id: string;
  schuelerId: string;
  klasseId: string;
  typ: 'front_seat' | 'quiet_area' | 'near_to' | 'away_from';
  targetSchuelerId: string | null;
  haerte: 'hard' | 'weighted';
  gewicht: number | null;
}

interface Props {
  klasseId: string;
  schueler: SchuelerData;
  allSchueler: SchuelerData[];
  onClose: () => void;
  onUpdated: () => void;
}

const REGEL_TYP_LABELS: Record<SitzregelItem['typ'], string> = {
  front_seat: 'Vorne sitzen',
  quiet_area: 'Ruhiger Sitzplatz',
  near_to: 'Nahe bei Schüler',
  away_from: 'Entfernt von Schüler',
};

export default function SitzregelEditor({ klasseId, schueler, allSchueler, onClose, onUpdated }: Props) {
  const [regeln, setRegeln] = useState<SitzregelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [typ, setTyp] = useState<SitzregelItem['typ']>('front_seat');
  const [targetSchuelerId, setTargetSchuelerId] = useState<string>('');
  const [haerte, setHaerte] = useState<SitzregelItem['haerte']>('hard');
  const [gewicht, setGewicht] = useState<number>(0.5);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/klassen/${klasseId}/schueler/${schueler.id}`);
        if (!res.ok) throw new Error('Fehler beim Laden der Sitzregeln.');
        const data = await res.json();
        if (!ignore) {
          setRegeln(data.sitzregeln || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Unerwarteter Fehler.');
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [klasseId, schueler.id]);

  const fetchRegeln = useCallback(async () => {
    try {
      const res = await fetch(`/api/klassen/${klasseId}/schueler/${schueler.id}`);
      if (res.ok) {
        const data = await res.json();
        setRegeln(data.sitzregeln || []);
      }
    } catch {
      // ignore
    }
  }, [klasseId, schueler.id]);

  const handleAddRegel = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);

    const isPeer = typ === 'near_to' || typ === 'away_from';
    const payload = {
      typ,
      targetSchuelerId: isPeer ? targetSchuelerId || null : null,
      haerte,
      gewicht: haerte === 'weighted' ? gewicht : null,
    };

    try {
      const res = await fetch(`/api/klassen/${klasseId}/schueler/${schueler.id}/sitzregeln`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || 'Fehler beim Erstellen der Sitzregel.');
      }

      setTargetSchuelerId('');
      await fetchRegeln();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRegel = async (regelId: string) => {
    try {
      const res = await fetch(`/api/klassen/${klasseId}/schueler/${schueler.id}/sitzregeln/${regelId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Fehler beim Löschen der Sitzregel.');
      await fetchRegeln();
      onUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Löschen.');
    }
  };

  const peerCandidates = allSchueler.filter((s) => s.id !== schueler.id);

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
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        }}
      >
        <h3>Sitzregeln für {schueler.name}</h3>

        {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}

        <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>Aktuelle Regeln ({regeln.length})</h4>
          {loading && <p>Lade Regeln...</p>}
          {!loading && regeln.length === 0 && <p style={{ color: '#666' }}>Keine Sitzregeln vorhanden.</p>}
          {!loading && regeln.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {regeln.map((r) => {
                const target = r.targetSchuelerId ? allSchueler.find((s) => s.id === r.targetSchuelerId) : null;
                return (
                  <li
                    key={r.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div>
                      <strong>{REGEL_TYP_LABELS[r.typ]}</strong>
                      {target && <span> ({target.name})</span>}
                      <span style={{ marginLeft: '0.5rem', color: '#6b7280', fontSize: '0.85rem' }}>
                        [{r.haerte === 'hard' ? 'Harte Regel' : `Gewichtet: ${r.gewicht}`}]
                      </span>
                    </div>
                    <Button variant="ghost" onClick={() => handleDeleteRegel(r.id)}>
                      Entfernen
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form onSubmit={handleAddRegel} style={{ borderTop: '1px solid #eee', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4>Neue Regel hinzufügen</h4>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Regeltyp</label>
            <select
              value={typ}
              onChange={(e) => setTyp(e.target.value as SitzregelItem['typ'])}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="front_seat">Vorne sitzen</option>
              <option value="quiet_area">Ruhiger Sitzplatz</option>
              <option value="near_to">Nahe bei Schüler</option>
              <option value="away_from">Entfernt von Schüler</option>
            </select>
          </div>

          {(typ === 'near_to' || typ === 'away_from') && (
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Ziel-Schüler *</label>
              <select
                required
                value={targetSchuelerId}
                onChange={(e) => setTargetSchuelerId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">-- Bitte wählen --</option>
                {peerCandidates.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.initialen})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Härte</label>
              <select
                value={haerte}
                onChange={(e) => setHaerte(e.target.value as SitzregelItem['haerte'])}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="hard">Hart (Muss-Bedingung)</option>
                <option value="weighted">Gewichtet (Wunsch)</option>
              </select>
            </div>

            {haerte === 'weighted' && (
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Gewicht ({gewicht})</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={gewicht}
                  onChange={(e) => setGewicht(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Schließen
            </Button>
            <Button type="submit" variant="primary" disabled={adding}>
              {adding ? 'Hinzufügen...' : 'Regel hinzufügen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
