import { redirect } from 'next/navigation';
import { getSession } from '../../../../src/services/auth';
import { KlasseError } from '../../../../src/domain/klasse';
import { getDefaultKlassenService } from '../../../../src/services/klasse';

import Link from 'next/link';
import Container from '../../../../src/ui/Container';
import Button from '../../../../src/ui/Button';
import SchuelerListe from './_components/SchuelerListe';

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>{klasse.name}</h2>
          {klasse.notizen && (
            <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
              <strong style={{ fontSize: '0.85rem', color: '#4b5563' }}>Notizen:</strong>
              <p style={{ margin: '0.25rem 0 0 0' }}>{klasse.notizen}</p>
            </div>
          )}
        </div>

        <Link href={`/klassen/${klasse.id}/edit`}>
          <Button variant="ghost">Klasse bearbeiten</Button>
        </Link>
      </div>

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

      <SchuelerListe klasseId={klasse.id} />
    </Container>
  );
}
