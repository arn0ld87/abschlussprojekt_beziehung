'use client';

import { useState } from 'react';
import Button from '../../../../../src/ui/Button';

type CsvImportPreviewResult = {
  totalRows: number;
  previewRows: any[];
};

export default function CsvImportModal({
  klasseId,
  onClose,
  onSaved,
}: {
  klasseId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [csvText, setCsvText] = useState('');
  const [strategy, setStrategy] = useState<'skip' | 'update' | 'duplicate'>('skip');
  const [preview, setPreview] = useState<CsvImportPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/klassen/${klasseId}/import/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Fehler beim Preview');
      }
      setPreview(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/klassen/${klasseId}/import/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, strategy }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Fehler beim Import');
      }
      alert(`Import erfolgreich: ${data.successCount} angelegt, ${data.updateCount} aktualisiert, ${data.skipCount} übersprungen, ${data.errorCount} Fehler.`);
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
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
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          width: '600px',
          maxWidth: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <h3 style={{ marginTop: 0 }}>CSV Import</h3>
        
        {error && (
          <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            CSV Text einfügen (Spalten: Name, Initialen, Farbe, Lernstand, Verhalten, Notizen, Sitzregeln)
          </label>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            style={{ width: '100%', height: '150px', padding: '0.5rem' }}
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Bei Duplikaten (selber Name)
          </label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as any)}
            style={{ width: '100%', padding: '0.5rem' }}
            disabled={loading}
          >
            <option value="skip">Überspringen</option>
            <option value="update">Aktualisieren</option>
            <option value="duplicate">Trotzdem anlegen (Duplizieren)</option>
          </select>
        </div>

        {preview && (
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
            <h4>Vorschau ({preview.totalRows} Zeilen erkannt)</h4>
            <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
              {preview.previewRows.map((r, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>
                  <strong>{r.schueler?.name || 'Kein Name'}</strong> 
                  {r.errors.length > 0 && (
                    <span style={{ color: 'red', marginLeft: '0.5rem' }}>
                      (Fehler: {r.errors.join(', ')})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>
          {!preview ? (
            <Button variant="primary" onClick={handlePreview} disabled={loading || !csvText.trim()}>
              {loading ? 'Lädt...' : 'Vorschau'}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleCommit} disabled={loading}>
              {loading ? 'Lädt...' : 'Importieren'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
