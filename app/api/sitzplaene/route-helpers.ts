import { NextResponse } from 'next/server';
import { getSession } from '../../../src/services/auth';
import { getDefaultSitzplanService } from '../../../src/services/sitzplan';
import { SitzplanError } from '../../../src/domain/sitzplan';

export async function requireUser(req: Request) {
  const user = await getSession(req);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { code: 'UNAUTHORIZED', error: { code: 'UNAUTHORIZED', message: 'Nicht angemeldet.' } },
        { status: 401 }
      ),
    };
  }
  return { user, response: null };
}

export function getService() {
  return getDefaultSitzplanService();
}

export function handleSitzplanError(err: unknown) {
  if (err instanceof SitzplanError) {
    const status = err.code === 'VALIDATION_ERROR' ? 422 : err.code === 'FORBIDDEN' ? 403 : 404;
    return NextResponse.json({ code: err.code, error: { code: err.code, message: err.message } }, { status });
  }
  return NextResponse.json(
    { code: 'INTERNAL_ERROR', error: { code: 'INTERNAL_ERROR', message: 'Ein unerwarteter Fehler ist aufgetreten.' } },
    { status: 500 }
  );
}
