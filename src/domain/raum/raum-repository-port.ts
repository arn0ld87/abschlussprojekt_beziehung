import { Raum, RaumDokument } from './raum';

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
    canvasDocument: RaumDokument;
  }): Promise<Raum>;
  update(id: string, data: {
    name?: string;
    breiteCm?: number;
    laengeCm?: number;
    rasterCm?: number;
    dokumentVersion?: number;
    canvasDocument?: RaumDokument;
    updatedAt: Date;
  }): Promise<Raum>;
  softDelete(id: string): Promise<void>;
}
