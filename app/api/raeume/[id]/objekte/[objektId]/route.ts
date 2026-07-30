import { NextResponse } from 'next/server';
import { requireUser, getService, handleRaumError } from '../../../route-helpers';

export const dynamic = 'force-dynamic';

// PATCH /api/raeume/[id]/objekte/[objektId] — speichert die Zielposition
// eines Objekts nach abgeschlossener Drag-Interaktion (M2 #52). Dünner
// Adapter: Rasterfang, Begrenzung und Validierung liegen im RaumService.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; objektId: string }> },
) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const service = getService();
  const { id, objektId } = await params;

  try {
    const raum = await service.bewegeObjekt(user.id, id, objektId, body);
    return NextResponse.json(raum);
  } catch (err) {
    return handleRaumError(err);
  }
}
