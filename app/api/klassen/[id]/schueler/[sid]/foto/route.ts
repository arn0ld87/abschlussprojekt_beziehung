import { NextResponse } from "next/server";
import { requireUser } from "../../../../route-helpers";
import { getDefaultFotoService } from "../../../../../../src/services/foto";
import { getDefaultSchuelerService } from "../../../../../../src/services/schueler";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId, sid: schuelerId } = await params;
  
  const schuelerService = getDefaultSchuelerService();
  try {
    await schuelerService.getById(user.id, klasseId, schuelerId);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error & { code?: string }).message }, { status: (err as Error & { code?: string }).code === "FORBIDDEN" ? 403 : 404 });
  }

  const fotoService = getDefaultFotoService();
  const foto = await fotoService.getFotoBySchuelerId(schuelerId);
  if (!foto) {
    return new NextResponse(null, { status: 404 });
  }

  const buffer = await fotoService.getFotoDatei(foto.pfad);
  if (!buffer) {
    return new NextResponse(null, { status: 404 });
  }

  const etag = `"${foto.id}-${foto.updatedAt.getTime()}"`;
  
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": foto.mimeType,
      "Content-Length": foto.groesse.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": etag,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId, sid: schuelerId } = await params;

  const schuelerService = getDefaultSchuelerService();
  try {
    await schuelerService.getById(user.id, klasseId, schuelerId);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error & { code?: string }).message }, { status: (err as Error & { code?: string }).code === "FORBIDDEN" ? 403 : 404 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "No FormData provided." }, { status: 400 });
  }

  const datei = formData.get("foto") as File | null;
  if (!datei) {
    return NextResponse.json({ error: "Missing foto field." }, { status: 400 });
  }

  const fotoService = getDefaultFotoService();
  try {
    const foto = await fotoService.uploadFoto(schuelerId, datei);
    return NextResponse.json(foto, { status: 201 });
  } catch (err: unknown) {
    const status = (err as Error & { code?: string }).code === "VALIDATION_ERROR" ? 422 : 500;
    return NextResponse.json({ error: (err as Error & { code?: string }).message }, { status });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const { id: klasseId, sid: schuelerId } = await params;

  const schuelerService = getDefaultSchuelerService();
  try {
    await schuelerService.getById(user.id, klasseId, schuelerId);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error & { code?: string }).message }, { status: (err as Error & { code?: string }).code === "FORBIDDEN" ? 403 : 404 });
  }

  const fotoService = getDefaultFotoService();
  try {
    await fotoService.deleteFoto(schuelerId);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    if ((err as Error & { code?: string }).code === "NOT_FOUND") {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.json({ error: (err as Error & { code?: string }).message }, { status: 500 });
  }
}
