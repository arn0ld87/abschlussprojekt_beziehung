import { NextResponse } from 'next/server';
import { requireUser, getService, handleRaumError } from './route-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const service = getService();
  try {
    const raeume = await service.list(user.id);
    return NextResponse.json(raeume);
  } catch (err) {
    return handleRaumError(err);
  }
}

export async function POST(req: Request) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const service = getService();

  try {
    const raum = await service.create(user.id, body);
    return NextResponse.json(raum, { status: 201 });
  } catch (err) {
    return handleRaumError(err);
  }
}
