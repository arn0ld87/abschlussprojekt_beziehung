import { NextResponse } from 'next/server';
import { getSession } from '../../../src/services/auth';
import { getDefaultRaumService } from '../../../src/services/raum';
import { RaumError } from '../../../src/domain/raum';

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
  return getDefaultRaumService();
}

export function handleRaumError(err: unknown) {
  if (err instanceof RaumError) {
    const status =
      err.code === 'VALIDATION_ERROR'
        ? 422
        : err.code === 'FORBIDDEN'
          ? 403
          : err.code === 'CONFLICT'
            ? 409
            : 404;
    return NextResponse.json({ code: err.code, error: { code: err.code, message: err.message } }, { status });
  }
  return NextResponse.json(
    { code: 'INTERNAL_ERROR', error: { code: 'INTERNAL_ERROR', message: 'Ein unerwarteter Fehler ist aufgetreten.' } },
    { status: 500 }
  );
}
