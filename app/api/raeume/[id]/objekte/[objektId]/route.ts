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

// DELETE /api/raeume/[id]/objekte/[objektId] — entfernt genau das
// ausgewählte Objekt aus dem Raumdokument (M2 #53).
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; objektId: string }> },
) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const service = getService();
  const { id, objektId } = await params;

  try {
    await service.entferneObjekt(user.id, id, objektId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRaumError(err);
  }
}
