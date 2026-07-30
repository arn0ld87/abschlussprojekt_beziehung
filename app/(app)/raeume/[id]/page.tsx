import { redirect } from 'next/navigation';
import { getSession } from '../../../../src/services/auth';
import { RaumError } from '../../../../src/domain/raum';
import { getDefaultRaumService } from '../../../../src/services/raum';

import Link from 'next/link';
import Container from '../../../../src/ui/Container';
import RaumEditor from './_components/RaumEditor';

export const dynamic = 'force-dynamic';

export default async function RaumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect('/signin');

  const service = getDefaultRaumService();
  let raum;
  try {
    raum = await service.getById(user.id, (await params).id);
  } catch (err) {
    if (err instanceof RaumError) {
      return (
        <Container>
          <p>Raum nicht gefunden oder keine Berechtigung.</p>
          <Link href="/raeume">Zurück zur Übersicht</Link>
        </Container>
      );
    }
    throw err;
  }

  return (
    <Container>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/raeume" style={{ textDecoration: 'none' }}>&larr; Zurück zur Übersicht</Link>
      </div>

      <h2>{raum.name}</h2>
      <p style={{ color: '#666', marginTop: 0 }}>
        {raum.breiteCm} × {raum.laengeCm} cm · Raster {raum.rasterCm} cm · Dokumentversion {raum.dokumentVersion}
      </p>

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

      <RaumEditor
        raum={{
          id: raum.id,
          name: raum.name,
          breiteCm: raum.breiteCm,
          laengeCm: raum.laengeCm,
          rasterCm: raum.rasterCm,
          dokumentVersion: raum.dokumentVersion,
          objekte: raum.canvasDocument.objekte,
        }}
      />
    </Container>
  );
}
