import { NextResponse } from 'next/server';
import { requireUser } from '../../../../route-helpers';
import { getDefaultSitzregelService } from '../../../../../../../src/services/sitzregel';
import { SitzregelError } from '../../../../../../../src/domain/sitzregel';
import { handleSchuelerApiError } from '../../route';

export const dynamic = 'force-dynamic';

export function handleSitzregelApiError(err: unknown) {
  if (err instanceof SitzregelError) {
    const status = err.code === 'VALIDATION_ERROR' ? 422 : err.code === 'FORBIDDEN' ? 403 : 404;
    return NextResponse.json({ code: err.code, error: { code: err.code, message: err.message } }, { status });
  }
  return handleSchuelerApiError(err);
}

export async function POST(req: Request, props: { params: Promise<{ id: string; sid: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId, sid: schuelerId } = await props.params;
  const body = await req.json().catch(() => ({}));
  const service = getDefaultSitzregelService();

  try {
    const sitzregel = await service.create(user.id, klasseId, schuelerId, body);
    return NextResponse.json(sitzregel, { status: 201 });
  } catch (err) {
    return handleSitzregelApiError(err);
  }
}
