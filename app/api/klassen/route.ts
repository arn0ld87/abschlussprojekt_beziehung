import { NextResponse } from 'next/server';
import { requireUser, getService, handleKlasseError } from './route-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const service = getService();
  try {
    const klassen = await service.list(user.id);
    return NextResponse.json(klassen);
  } catch (err) {
    return handleKlasseError(err);
  }
}

export async function POST(req: Request) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const service = getService();

  try {
    const klasse = await service.create(user.id, body);
    return NextResponse.json(klasse, { status: 201 });
  } catch (err) {
    return handleKlasseError(err);
  }
}
