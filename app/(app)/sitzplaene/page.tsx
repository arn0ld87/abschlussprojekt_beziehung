import { redirect } from 'next/navigation';
import { getSession } from '../../../src/services/auth';
import { getDefaultSitzplanService } from '../../../src/services/sitzplan';

import Link from 'next/link';
import Container from '../../../src/ui/Container';
import Button from '../../../src/ui/Button';

export const dynamic = 'force-dynamic';

export default async function SitzplaenePage() {
  const user = await getSession();
  if (!user) redirect('/signin');

  const service = getDefaultSitzplanService();
  const sitzplaene = await service.list(user.id);

  return (
    <Container>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Meine Sitzpläne</h2>
        <Link href="/sitzplaene/neu">
          <Button>Neuer Sitzplan</Button>
        </Link>
      </div>

      {sitzplaene.length === 0 ? (
        <p>Noch keine Sitzpläne angelegt.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {sitzplaene.map(sitzplan => {
            const geometrie = sitzplan.canvasDocument.raumGeometrie;
            // Die angezeigten Maße stammen aus dem eingefrorenen Plandokument,
            // nicht aus der (möglicherweise geänderten) Raumvorlage.
            const masse = `${geometrie.breiteCm} × ${geometrie.laengeCm} cm · Raster ${geometrie.rasterCm} cm`;
            const plaetze = `${geometrie.sitzplaetze.length} Sitzplätze`;
            return (
              <li key={sitzplan.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                <Link href={`/sitzplaene/${sitzplan.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{sitzplan.name}</h3>
                  <p style={{ margin: 0, color: '#666' }}>{masse}</p>
                  <p style={{ margin: 0, color: '#666' }}>{plaetze}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
