import { NextResponse } from 'next/server';
import { requireUser, getService, handleSitzplanError } from '../../route-helpers';

export const dynamic = 'force-dynamic';

/**
 * Schreibt die Schülerzuordnung eines Sitzplans (M3 #57). Der Route Handler
 * delegiert vollständig an den framework-freien Service — Berechtigung,
 * Klassenzugehörigkeit, Soft-Delete und die harten Zuordnungs-Invarianten
 * werden dort geprüft, nicht hier und erst recht nicht in der Oberfläche.
 *
 * Bewusst PUT: Der Client sendet den vollständigen gewünschten Zustand der
 * Zuordnungsliste. Debounce-Autosave und Revisionskonflikte folgen mit
 * M3 #59 (ADR-0004).
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser(req);
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const service = getService();

  try {
    const sitzplan = await service.setzeZuordnungen(user.id, (await params).id, body);
    return NextResponse.json(sitzplan);
  } catch (err) {
    return handleSitzplanError(err);
  }
}
