import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../route-helpers';
import { getDefaultSitzregelService } from '../../../../../../../../src/services/sitzregel';
import { handleSitzregelApiError } from '../route';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, props: { params: Promise<{ id: string; sid: string; rid: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId, sid: schuelerId, rid: regelId } = await props.params;
  const body = await req.json().catch(() => ({}));
  const service = getDefaultSitzregelService();

  try {
    const sitzregel = await service.update(user.id, klasseId, schuelerId, regelId, body);
    return NextResponse.json(sitzregel);
  } catch (err) {
    return handleSitzregelApiError(err);
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string; sid: string; rid: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId, sid: schuelerId, rid: regelId } = await props.params;
  const service = getDefaultSitzregelService();

  try {
    await service.delete(user.id, klasseId, schuelerId, regelId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleSitzregelApiError(err);
  }
}
