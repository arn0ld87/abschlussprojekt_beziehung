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
    await klassenService.getById(user.id, id); // check access

    let parsedBody: unknown;
    try {
      parsedBody = await req.json();
    } catch {
      return NextResponse.json(
        { code: 'BAD_REQUEST', error: { message: 'Request-Body ist kein gültiges JSON.' } },
        { status: 400 },
      );
    }
    if (!parsedBody || typeof parsedBody !== 'object') {
      return NextResponse.json(
        { code: 'BAD_REQUEST', error: { message: 'Request-Body muss ein Objekt sein.' } },
        { status: 400 },
      );
    }
    const { csvText } = parsedBody as { csvText?: unknown };
    if (typeof csvText !== 'string') {
      return NextResponse.json(
        { code: 'BAD_REQUEST', error: { message: 'csvText fehlt oder ist kein String.' } },
        { status: 400 },
      );
    }

    const service = getDefaultCsvImportService();
    const result = service.preview(csvText, 5);

    return NextResponse.json(result);
  } catch (err) {
    return handleKlasseError(err);
  }
}
