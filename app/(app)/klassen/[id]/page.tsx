import { redirect } from 'next/navigation';
import { getSession } from '../../../../src/services/auth';
import { KlasseError } from '../../../../src/domain/klasse';
import { getDefaultKlassenService } from '../../../../src/services/klasse';

import Link from 'next/link';
import Container from '../../../../src/ui/Container';
import Button from '../../../../src/ui/Button';

export const dynamic = 'force-dynamic';

export default async function KlasseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect('/signin');

  const service = getDefaultKlassenService();
  let klasse;
  try {
    klasse = await service.getById(user.id, (await params).id);
  } catch (err) {
    if (err instanceof KlasseError) {
      return (
        <Container>
          <p>Klasse nicht gefunden oder keine Berechtigung.</p>
          <Link href="/klassen">Zurück zur Übersicht</Link>
        </Container>
      );
    }
    throw err;
  }

  return (
    <Container>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/klassen" style={{ textDecoration: 'none' }}>&larr; Zurück zur Übersicht</Link>
      </div>
      <h2>{klasse.name}</h2>
      {klasse.notizen && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <h4>Notizen:</h4>
          <p>{klasse.notizen}</p>
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <Link href={`/klassen/${klasse.id}/edit`}>
          <Button variant="ghost">Bearbeiten</Button>
        </Link>
      </div>
    </Container>
  );
}
