import { redirect } from 'next/navigation';
import { getSession } from '../../../../src/services/auth';
import { SitzplanError } from '../../../../src/domain/sitzplan';
import { getDefaultSitzplanService } from '../../../../src/services/sitzplan';
import { getDefaultKlassenService } from '../../../../src/services/klasse';
import { getDefaultRaumService } from '../../../../src/services/raum';

import Link from 'next/link';
import Container from '../../../../src/ui/Container';
import SitzplanVerwaltung from './_components/SitzplanVerwaltung';

export const dynamic = 'force-dynamic';

// Die Quellnamen sind reine Anzeigehilfe: Ein Plan bleibt lesbar, auch wenn
// Klasse oder Raumvorlage inzwischen soft-gelöscht wurden — die fachliche
// Wahrheit des Plans steht im eingefrorenen Dokument.
async function quellenName(laden: () => Promise<{ name: string }>, fallback: string): Promise<string> {
  return laden()
    .then((quelle) => quelle.name)
    .catch(() => fallback);
}

export default async function SitzplanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect('/signin');

  const service = getDefaultSitzplanService();
  let sitzplan;
  try {
    sitzplan = await service.getById(user.id, (await params).id);
  } catch (err) {
    if (err instanceof SitzplanError) {
      return (
        <Container>
          <p>Sitzplan nicht gefunden oder keine Berechtigung.</p>
          <Link href="/sitzplaene">Zurück zur Übersicht</Link>
        </Container>
      );
    }
    throw err;
  }

  const dokument = sitzplan.canvasDocument;
  const geometrie = dokument.raumGeometrie;

  const klassenName = await quellenName(
    () => getDefaultKlassenService().getById(user.id, sitzplan.klasseId),
    dokument.quelle.klasseId,
  );
  const raumName = await quellenName(
    () => getDefaultRaumService().getById(user.id, sitzplan.raumId),
    dokument.quelle.raumId,
  );

  const masse = `${geometrie.breiteCm} × ${geometrie.laengeCm} cm · Raster ${geometrie.rasterCm} cm`;

  return (
    <Container>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/sitzplaene" style={{ textDecoration: 'none' }}>&larr; Zurück zur Übersicht</Link>
      </div>

      <h2>{sitzplan.name}</h2>

      <dl style={{ margin: '0 0 1rem 0', color: '#666' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <dt>Klasse:</dt>
          <dd style={{ margin: 0 }}>{klassenName}</dd>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <dt>Raumvorlage:</dt>
          <dd style={{ margin: 0 }}>{raumName}</dd>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <dt>Eingefrorene Maße:</dt>
          <dd style={{ margin: 0 }}>{masse}</dd>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <dt>Sitzplätze:</dt>
          <dd style={{ margin: 0 }}>{geometrie.sitzplaetze.length}</dd>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <dt>Revision:</dt>
          <dd style={{ margin: 0 }}>{sitzplan.revision}</dd>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <dt>Dokumentversion:</dt>
          <dd style={{ margin: 0 }}>{sitzplan.dokumentVersion}</dd>
        </div>
      </dl>

      <p style={{ color: '#666' }}>
        Die Geometrie dieses Plans ist beim Anlegen eingefroren worden. Änderungen an der Raumvorlage
        wirken sich nicht rückwirkend auf diesen Sitzplan aus.
      </p>

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

      <SitzplanVerwaltung id={sitzplan.id} name={sitzplan.name} />
    </Container>
  );
}
