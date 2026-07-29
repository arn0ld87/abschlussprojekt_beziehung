import { Raum, RaumDokumentV1 } from './raum';

export interface RaumRepository {
  findAllByUserId(userId: string): Promise<Raum[]>;
  findById(id: string): Promise<Raum | null>;
  create(data: {
    id: string;
    name: string;
    userId: string;
    breiteCm: number;
    laengeCm: number;
    rasterCm: number;
    dokumentVersion: number;
    canvasDocument: RaumDokumentV1;
  }): Promise<Raum>;
  update(id: string, data: {
    name?: string;
    breiteCm?: number;
    laengeCm?: number;
    rasterCm?: number;
    canvasDocument?: RaumDokumentV1;
    updatedAt: Date;
  }): Promise<Raum>;
  softDelete(id: string): Promise<void>;
}
