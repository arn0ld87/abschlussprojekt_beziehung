import { redirect } from 'next/navigation';
import { getSession } from '../../../src/services/auth';

import { getDefaultRaumService } from '../../../src/services/raum';

import Link from 'next/link';
import Container from '../../../src/ui/Container';
import Button from '../../../src/ui/Button';

export const dynamic = 'force-dynamic';

export default async function RaeumePage() {
  const user = await getSession();
  if (!user) redirect('/signin');

  const service = getDefaultRaumService();
  const raeume = await service.list(user.id);

  return (
    <Container>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Meine Raumvorlagen</h2>
        <Link href="/raeume/neu">
          <Button>Neue Raumvorlage</Button>
        </Link>
      </div>

      {raeume.length === 0 ? (
        <p>Noch keine Raumvorlagen angelegt.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {raeume.map(raum => (
            <li key={raum.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
              <Link href={`/raeume/${raum.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{raum.name}</h3>
                <p style={{ margin: 0, color: '#666' }}>
                  {raum.breiteCm} × {raum.laengeCm} cm · Raster {raum.rasterCm} cm
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
