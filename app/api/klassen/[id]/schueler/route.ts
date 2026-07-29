import { NextResponse } from 'next/server';
import { requireUser, handleKlasseError } from '../../route-helpers';
import { getDefaultSchuelerService } from '../../../../../src/services/schueler';
import { SchuelerError } from '../../../../../src/domain/schueler';

export const dynamic = 'force-dynamic';

export function handleSchuelerApiError(err: unknown) {
  if (err instanceof SchuelerError) {
    const status = err.code === 'VALIDATION_ERROR' ? 422 : err.code === 'FORBIDDEN' ? 403 : 404;
    return NextResponse.json({ code: err.code, error: { code: err.code, message: err.message } }, { status });
  }
  return handleKlasseError(err);
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId } = await props.params;
  const service = getDefaultSchuelerService();

  try {
    const list = await service.list(user.id, klasseId);
    return NextResponse.json(list);
  } catch (err) {
    return handleSchuelerApiError(err);
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId } = await props.params;
  const body = await req.json().catch(() => ({}));
  const service = getDefaultSchuelerService();

  try {
    const schueler = await service.create(user.id, klasseId, body);
    return NextResponse.json(schueler, { status: 201 });
  } catch (err) {
    return handleSchuelerApiError(err);
  }
}
