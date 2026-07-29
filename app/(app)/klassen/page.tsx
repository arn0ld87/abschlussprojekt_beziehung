import { redirect } from 'next/navigation';
import { getSession } from '../../../src/services/auth';

import { getDefaultKlassenService } from "../../../src/services/klasse";

import Link from 'next/link';
import Container from '../../../src/ui/Container';
import Button from '../../../src/ui/Button';

export const dynamic = 'force-dynamic';

export default async function KlassenPage() {
  const user = await getSession();
  if (!user) redirect('/signin');

  const service = getDefaultKlassenService();
  const klassen = await service.list(user.id);

  return (
    <Container>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Meine Klassen</h2>
        <Link href="/klassen/neu">
          <Button>Neue Klasse</Button>
        </Link>
      </div>

      {klassen.length === 0 ? (
        <p>Noch keine Klassen angelegt.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {klassen.map(klasse => (
            <li key={klasse.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
              <Link href={`/klassen/${klasse.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{klasse.name}</h3>
                {klasse.notizen && <p style={{ margin: 0, color: '#666' }}>{klasse.notizen}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
