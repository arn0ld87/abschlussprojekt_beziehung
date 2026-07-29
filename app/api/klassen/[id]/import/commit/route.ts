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
    const { csvText, strategy } = parsedBody as { csvText?: unknown; strategy?: unknown };
    if (typeof csvText !== 'string' || typeof strategy !== 'string') {
      return NextResponse.json(
        { code: 'BAD_REQUEST', error: { message: 'csvText und strategy müssen Strings sein.' } },
        { status: 400 },
      );
    }
    const allowedStrategies = ['skip', 'update', 'duplicate'] as const;
    if (!(allowedStrategies as readonly string[]).includes(strategy)) {
      return NextResponse.json(
        { code: 'BAD_REQUEST', error: { message: 'strategy muss skip, update oder duplicate sein.' } },
        { status: 400 },
      );
    }

    const service = getDefaultCsvImportService();
    const result = await service.commit(user.id, id, csvText, strategy as 'skip' | 'update' | 'duplicate');

    return NextResponse.json(result);
  } catch (err) {
    return handleKlasseError(err);
  }
}
