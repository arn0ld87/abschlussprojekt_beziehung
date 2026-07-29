import { NextResponse } from 'next/server';
import { requireUser, getService, handleKlasseError } from '../route-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const service = getService();
  try {
    const klasse = await service.getById(user.id, (await params).id);
    return NextResponse.json(klasse);
  } catch (err) {
    return handleKlasseError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const service = getService();

  try {
    const klasse = await service.update(user.id, (await params).id, body);
    return NextResponse.json(klasse);
  } catch (err) {
    return handleKlasseError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const service = getService();
  try {
    await service.delete(user.id, (await params).id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleKlasseError(err);
  }
}
