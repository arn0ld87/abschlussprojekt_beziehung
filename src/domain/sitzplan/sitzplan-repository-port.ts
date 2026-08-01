import { Sitzplan, SitzplanDokumentV1 } from './sitzplan';

export interface SitzplanCreateData {
  id: string;
  name: string;
  userId: string;
  klasseId: string;
  raumId: string;
  revision: number;
  dokumentVersion: number;
  canvasDocument: SitzplanDokumentV1;
}

// Name und Plandokument sind änderbar: Umbenennen (M3 #56) und die
// Schülerzuordnung (M3 #57) schreiben das vollständige validierte Dokument.
// Die Revision bleibt bewusst außen vor — sie wird erst vom Autosave unter
// optimistischer Nebenläufigkeitskontrolle fortgeschrieben (M3 #59, ADR-0004).
export interface SitzplanUpdateData {
  name?: string;
  canvasDocument?: SitzplanDokumentV1;
  updatedAt: Date;
}

export interface SitzplanRepository {
  /** Liefert ausschließlich eigene, nicht soft-gelöschte Pläne. */
  findAllByUserId(userId: string): Promise<Sitzplan[]>;
  findById(id: string): Promise<Sitzplan | null>;
  create(data: SitzplanCreateData): Promise<Sitzplan>;
  update(id: string, data: SitzplanUpdateData): Promise<Sitzplan>;
  softDelete(id: string): Promise<void>;
}
