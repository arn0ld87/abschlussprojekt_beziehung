// Verhindert statisches Caching / SSG. Authentifizierte Routen mit persoenlichen
// Daten muessen zur Request-Zeit ausgewertet werden.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Antworten mit Authentifizierungskontext duerfen weder in Proxys noch im
// Browser-Cache landen.
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireUser } from "../../../../route-helpers";
import { getDefaultFotoService } from "../../../../../../../src/services/foto";
import { getDefaultSchuelerService } from "../../../../../../../src/services/schueler";
import { FotoServiceError } from "../../../../../../../src/domain/foto/foto-service";

type ServiceError = Error & { code?: string };

function statusForCode(code: string | undefined): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 422;
    case "PAYLOAD_TOO_LARGE":
      return 413;
    case "UNSUPPORTED_MEDIA_TYPE":
      return 415;
    case "NOT_FOUND":
      return 404;
    case "FORBIDDEN":
      return 403;
    default:
      return 500;
  }
}

function secureImageHeaders(buffer: Buffer, mimeType: string) {
  return {
    "Content-Type": mimeType,
    "Content-Length": buffer.byteLength.toString(),
    // Persoenliche Inhalte (Fotos von Schuelern) sind niemals oeffentlich cachebar.
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId, sid: schuelerId } = await params;

  const schuelerService = getDefaultSchuelerService();
  try {
    await schuelerService.getById(user.id, klasseId, schuelerId);
  } catch (err: unknown) {
    const e = err as ServiceError;
    return NextResponse.json(
      { code: e.code ?? "NOT_FOUND", error: { code: e.code ?? "NOT_FOUND", message: e.message } },
      { status: statusForCode(e.code) }
    );
  }

  const fotoService = getDefaultFotoService();
  const foto = await fotoService.getFotoBySchuelerId(schuelerId);
  if (!foto) {
    return new NextResponse(null, {
      status: 404,
      headers: { "X-Content-Type-Options": "nosniff" },
    });
  }

  const buffer = await fotoService.getFotoDatei(foto.internerDateiname);
  if (!buffer) {
    // Datei existiert nicht auf dem Volume -> DB-Eintrag muss weg.
    await fotoService.deleteFoto(schuelerId).catch(() => undefined);
    return new NextResponse(null, {
      status: 404,
      headers: { "X-Content-Type-Options": "nosniff" },
    });
  }

  const etag = `"${foto.id}-${foto.updatedAt.getTime()}"`;

  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      ...secureImageHeaders(buffer, foto.mimeType),
      ETag: etag,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId, sid: schuelerId } = await params;

  const schuelerService = getDefaultSchuelerService();
  try {
    await schuelerService.getById(user.id, klasseId, schuelerId);
  } catch (err: unknown) {
    const e = err as ServiceError;
    return NextResponse.json(
      { code: e.code ?? "NOT_FOUND", error: { code: e.code ?? "NOT_FOUND", message: e.message } },
      { status: statusForCode(e.code) }
    );
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", error: { code: "VALIDATION_ERROR", message: "Kein FormData uebermittelt." } },
      { status: 400 }
    );
  }

  const datei = formData.get("foto");
  if (!(datei instanceof File)) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", error: { code: "VALIDATION_ERROR", message: "Feld 'foto' fehlt." } },
      { status: 400 }
    );
  }

  const fotoService = getDefaultFotoService();
  try {
    const foto = await fotoService.uploadFoto(schuelerId, datei);
    return NextResponse.json(
      {
        id: foto.id,
        schuelerId: foto.schuelerId,
        mimeType: foto.mimeType,
        byteSize: foto.byteSize,
        createdAt: foto.createdAt,
        updatedAt: foto.updatedAt,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (err: unknown) {
    if (err instanceof FotoServiceError) {
      return NextResponse.json(
        { code: err.code, error: { code: err.code, message: err.message } },
        {
          status: statusForCode(err.code),
          headers: {
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        }
      );
    }
    // Generischer Fehler: keine internen Details nach aussen geben.
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        error: { code: "INTERNAL_ERROR", message: "Interner Fehler beim Foto-Upload." },
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId, sid: schuelerId } = await params;

  const schuelerService = getDefaultSchuelerService();
  try {
    await schuelerService.getById(user.id, klasseId, schuelerId);
  } catch (err: unknown) {
    const e = err as ServiceError;
    return NextResponse.json(
      { code: e.code ?? "NOT_FOUND", error: { code: e.code ?? "NOT_FOUND", message: e.message } },
      { status: statusForCode(e.code) }
    );
  }

  const fotoService = getDefaultFotoService();
  try {
    await fotoService.deleteFoto(schuelerId);
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    if (err instanceof FotoServiceError) {
      return NextResponse.json(
        { code: err.code, error: { code: err.code, message: err.message } },
        { status: statusForCode(err.code) }
      );
    }
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        error: { code: "INTERNAL_ERROR", message: "Interner Fehler beim Loeschen." },
      },
      { status: 500 }
    );
  }
}
