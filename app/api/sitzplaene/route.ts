import { NextResponse } from 'next/server';
import { requireUser, getService, handleSitzplanError } from './route-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const service = getService();
  try {
    const sitzplaene = await service.list(user.id);
    return NextResponse.json(sitzplaene);
  } catch (err) {
    return handleSitzplanError(err);
  }
}

export async function POST(req: Request) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const service = getService();

  try {
    const sitzplan = await service.create(user.id, body);
    return NextResponse.json(sitzplan, { status: 201 });
  } catch (err) {
    return handleSitzplanError(err);
  }
}
