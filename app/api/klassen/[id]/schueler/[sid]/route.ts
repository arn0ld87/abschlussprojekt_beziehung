import { NextResponse } from 'next/server';
import { requireUser } from '../../../route-helpers';
import { handleSchuelerApiError } from '../route';
import { getDefaultSchuelerService } from '../../../../../../src/services/schueler';
import { getDefaultSitzregelService } from '../../../../../../src/services/sitzregel';
import { getDefaultFotoService } from '../../../../../../src/services/foto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, props: { params: Promise<{ id: string; sid: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId, sid: schuelerId } = await props.params;
  const schuelerService = getDefaultSchuelerService();
  const sitzregelService = getDefaultSitzregelService();

  try {
    const schueler = await schuelerService.getById(user.id, klasseId, schuelerId);
    const sitzregeln = await sitzregelService.listForSchueler(user.id, klasseId, schuelerId);
    return NextResponse.json({ ...schueler, sitzregeln });
  } catch (err) {
    return handleSchuelerApiError(err);
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string; sid: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId, sid: schuelerId } = await props.params;
  const body = await req.json().catch(() => ({}));
  const service = getDefaultSchuelerService();

  try {
    const schueler = await service.update(user.id, klasseId, schuelerId, body);
    return NextResponse.json(schueler);
  } catch (err) {
    return handleSchuelerApiError(err);
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string; sid: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId, sid: schuelerId } = await props.params;
  const service = getDefaultSchuelerService();

  try {
    await service.delete(user.id, klasseId, schuelerId, async (sid) => {
      try {
        const fotoService = getDefaultFotoService();
        await fotoService.deleteFoto(sid);
      } catch {
        // Best-effort cleanup
      }
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleSchuelerApiError(err);
  }
}
