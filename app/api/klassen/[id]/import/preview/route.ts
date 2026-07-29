import { NextResponse } from 'next/server';
import { requireUser, handleKlasseError } from '../../../route-helpers';
import { getDefaultCsvImportService } from '@/services/csv-import';
import { getDefaultKlassenService } from '@/services/klasse';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id } = await params;
  
  try {
    const klassenService = getDefaultKlassenService();
    await klassenService.getById(user.id, id); // check access
    
    const body = await req.json();
    if (!body.csvText) {
      return NextResponse.json({ code: 'BAD_REQUEST', error: { message: 'csvText fehlt.' } }, { status: 400 });
    }
    
    const service = getDefaultCsvImportService();
    const result = service.preview(body.csvText, 5);
    
    return NextResponse.json(result);
  } catch (err) {
    return handleKlasseError(err);
  }
}
