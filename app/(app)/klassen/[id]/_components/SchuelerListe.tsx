'use client';

import { useState, useEffect, useCallback } from 'react';
import Markierung from '../../../../../src/ui/Markierung';
import Button from '../../../../../src/ui/Button';
import SchuelerFormular from './SchuelerFormular';
import SitzregelEditor from './SitzregelEditor';
import CsvImportModal from './CsvImportModal';

export interface SchuelerData {
  id: string;
  klasseId: string;
  name: string;
  initialen: string;
  farbe: string;
  lernstand: string | null;
  verhalten: string | null;
  freitextnotizen: string | null;
  fotoPlaceholderId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt: string | Date | null;
  sitzregeln?: Array<{
    id: string;
    schuelerId: string;
    klasseId: string;
    typ: 'front_seat' | 'quiet_area' | 'near_to' | 'away_from';
    targetSchuelerId: string | null;
    haerte: 'hard' | 'weighted';
    gewicht: number | null;
  }>;
}

export default function SchuelerListe({ klasseId }: { klasseId: string }) {
  const [schuelerList, setSchuelerList] = useState<SchuelerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingSchueler, setEditingSchueler] = useState<SchuelerData | null | 'new'>(null);
  const [managingSitzregelnSchueler, setManagingSitzregelnSchueler] = useState<SchuelerData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/klassen/${klasseId}/schueler`);
        if (!res.ok) throw new Error('Fehler beim Laden der Schülerliste.');
        const data = await res.json();
        if (!ignore) {
          setSchuelerList(data);
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
  }, [klasseId]);

  const fetchSchueler = useCallback(async () => {
    try {
      const res = await fetch(`/api/klassen/${klasseId}/schueler`);
      if (res.ok) {
        const data = await res.json();
        setSchuelerList(data);
      }
    } catch {
      // ignore
    }
  }, [klasseId]);

  const handleDelete = async (id: string, name: string) => {
    if (deletingId) return;
    if (!confirm(`Schüler "${name}" wirklich löschen?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/klassen/${klasseId}/schueler/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Fehler beim Löschen des Schülers.');
      }
      await fetchSchueler();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Löschen.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Schülerinnen & Schüler ({schuelerList.length})</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="ghost" onClick={() => setIsImportModalOpen(true)}>
            CSV Import
          </Button>
          <Button variant="primary" onClick={() => setEditingSchueler('new')}>
            + Schüler hinzufügen
          </Button>
        </div>
      </div>

      {loading && <p>Lade Schülerliste...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && schuelerList.length === 0 && (
        <p style={{ color: '#666', fontStyle: 'italic' }}>Noch keine Schüler in dieser Klasse angelegt.</p>
      )}

      {!loading && schuelerList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {schuelerList.map((s, idx) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Markierung initialen={s.initialen} index={idx} size={40} />
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{s.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {s.lernstand && <span>Lernstand: {s.lernstand} | </span>}
                    {s.verhalten && <span>Verhalten: {s.verhalten}</span>}
                    {!s.lernstand && !s.verhalten && <span>Keine zusätzlichen Angaben</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="ghost" onClick={() => setManagingSitzregelnSchueler(s)}>
                  Sitzregeln
                </Button>
                <Button variant="ghost" onClick={() => setEditingSchueler(s)}>
                  Bearbeiten
                </Button>
                <Button variant="ghost" onClick={() => handleDelete(s.id, s.name)} disabled={deletingId === s.id}>
                  {deletingId === s.id ? 'Lösche...' : 'Löschen'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingSchueler && (
        <SchuelerFormular
          klasseId={klasseId}
          schueler={editingSchueler === 'new' ? null : editingSchueler}
          onClose={() => setEditingSchueler(null)}
          onSaved={() => {
            setEditingSchueler(null);
            fetchSchueler();
          }}
        />
      )}

      {managingSitzregelnSchueler && (
        <SitzregelEditor
          klasseId={klasseId}
          schueler={managingSitzregelnSchueler}
          allSchueler={schuelerList}
          onClose={() => setManagingSitzregelnSchueler(null)}
          onUpdated={fetchSchueler}
        />
      )}

      {isImportModalOpen && (
        <CsvImportModal
          klasseId={klasseId}
          onClose={() => setIsImportModalOpen(false)}
          onSaved={() => {
            setIsImportModalOpen(false);
            fetchSchueler();
          }}
        />
      )}
    </div>
  );
}
