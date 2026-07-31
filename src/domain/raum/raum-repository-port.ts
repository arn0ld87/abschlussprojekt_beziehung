import { Raum, RaumDokument } from './raum';

export interface RaumCreateData {
  id: string;
  name: string;
  userId: string;
  breiteCm: number;
  laengeCm: number;
  rasterCm: number;
  dokumentVersion: number;
  canvasDocument: RaumDokument;
}

export interface RaumUpdateData {
  name?: string;
  breiteCm?: number;
  laengeCm?: number;
  rasterCm?: number;
  dokumentVersion?: number;
  canvasDocument?: RaumDokument;
  updatedAt: Date;
}

export interface RaumRepository {
  findAllByUserId(userId: string): Promise<Raum[]>;
  findById(id: string): Promise<Raum | null>;
  create(data: RaumCreateData): Promise<Raum>;
  /**
   * Ohne erwartetUpdatedAt: unkonditioniertes Update.
   * Mit erwartetUpdatedAt: atomarer Compare-and-Swap — schlägt fehl (null),
   * wenn der Datensatz zwischenzeitlich geändert wurde (optimistische
   * Nebenläufigkeitskontrolle).
   */
  update(id: string, data: RaumUpdateData): Promise<Raum>;
  update(id: string, data: RaumUpdateData, erwartetUpdatedAt: Date): Promise<Raum | null>;
  softDelete(id: string): Promise<void>;
}
