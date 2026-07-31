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

// Nur der Name ist in diesem Slice änderbar. Autosave schreibt später
// Dokument und Revision unter optimistischer Nebenläufigkeitskontrolle
// (M3 #59, ADR-0004) — bewusst noch nicht Teil dieses Ports.
export interface SitzplanUpdateData {
  name?: string;
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
