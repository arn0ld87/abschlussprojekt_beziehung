import { NextResponse } from 'next/server';
import { requireUser, getService, handleRaumError } from '../../route-helpers';

export const dynamic = 'force-dynamic';

// POST /api/raeume/[id]/objekte — fügt ein Standardobjekt aus der
// Möbelpalette hinzu (M2 #51). Dünner Adapter: Validierung und Fachlogik
// liegen im RaumService.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const service = getService();

  try {
    const raum = await service.addObjekt(user.id, (await params).id, body);
    return NextResponse.json(raum, { status: 201 });
  } catch (err) {
    return handleRaumError(err);
  }
}
