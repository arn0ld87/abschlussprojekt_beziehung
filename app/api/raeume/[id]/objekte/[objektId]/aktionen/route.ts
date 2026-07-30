import { z } from 'zod';
import { NextResponse } from 'next/server';
import { requireUser, getService, handleRaumError } from '../../../../route-helpers';

export const dynamic = 'force-dynamic';

const AktionSchema = z.object({
  aktion: z.enum(['rotieren', 'duplizieren'], {
    errorMap: () => ({ message: 'Unbekannte Aktion.' }),
  }),
});

// POST /api/raeume/[id]/objekte/[objektId]/aktionen — führt eine
// Objektaktion aus (M2 #53): 'rotieren' (90° im Uhrzeigersinn) oder
// 'duplizieren' (neue UUID, rasterversetzte Position). Dünner Adapter:
// Fachlogik und Validierung liegen im RaumService.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; objektId: string }> },
) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const parsed = AktionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } },
      { status: 422 },
    );
  }

  const service = getService();
  const { id, objektId } = await params;

  try {
    const raum =
      parsed.data.aktion === 'rotieren'
        ? await service.rotiereObjekt(user.id, id, objektId)
        : await service.dupliziereObjekt(user.id, id, objektId);
    return NextResponse.json(raum);
  } catch (err) {
    return handleRaumError(err);
  }
}
