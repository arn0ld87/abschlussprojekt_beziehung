import { NextResponse } from 'next/server';
import { requireUser, handleKlasseError } from '../../../route-helpers';
import { getDefaultCsvImportService } from '../../../../../../src/services/csv-import';
import { getDefaultKlassenService } from '../../../../../../src/services/klasse';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id } = await params;

  try {
    const klassenService = getDefaultKlassenService();
    await klassenService.getById(user.id, id);

    const body = await req.json();
    if (!body.csvText || !body.strategy) {
      return NextResponse.json({ code: 'BAD_REQUEST', error: { message: 'csvText oder strategy fehlt.' } }, { status: 400 });
    }
    const allowedStrategies = ['skip', 'update', 'duplicate'] as const;
    if (!allowedStrategies.includes(body.strategy)) {
      return NextResponse.json(
        { code: 'BAD_REQUEST', error: { message: 'strategy muss skip, update oder duplicate sein.' } },
        { status: 400 },
      );
    }

    const service = getDefaultCsvImportService();
    const result = await service.commit(user.id, id, body.csvText, body.strategy);

    return NextResponse.json(result);
  } catch (err) {
    return handleKlasseError(err);
  }
}
