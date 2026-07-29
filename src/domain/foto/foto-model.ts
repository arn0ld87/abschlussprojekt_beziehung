import { z } from "zod";

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const FotoSchema = z.object({
  id: z.string().min(1),
  schuelerId: z.string().min(1),
  internerDateiname: z.string().min(1),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  byteSize: z.number().int().positive().max(MAX_PHOTO_BYTES),
  breitePx: z.number().int().positive().nullable().optional(),
  hoehePx: z.number().int().positive().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export type Foto = z.infer<typeof FotoSchema>;

export function isAllowedMimeType(mime: string): mime is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

/**
 * Magic-Bytes-Pruefung (stichprobenartig, Issue #45 Akzeptanzkriterium).
 * Prueft nur die ersten Bytes gegen die bekannten Signaturen JPEG/PNG/WebP.
 * Liefert true, wenn die Signatur passt ODER der MIME-Type nicht erlaubt ist
 * (Service validiert MIME separat, hier nur Defense-in-Depth).
 */
export function matchesMagicBytes(buffer: Uint8Array, mime: AllowedMimeType): boolean {
  // JPEG: FF D8 FF (3 Bytes genuegen als SOI-Marker).
  if (mime === "image/jpeg") {
    if (buffer.length < 3) return false;
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A (8 Bytes Signatur).
  if (mime === "image/png") {
    if (buffer.length < 8) return false;
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  // WebP: "RIFF" .... "WEBP" (12 Bytes fuer beide Marker).
  if (mime === "image/webp") {
    if (buffer.length < 12) return false;
    return (
      buffer[0] === 0x52 && // R
      buffer[1] === 0x49 && // I
      buffer[2] === 0x46 && // F
      buffer[3] === 0x46 && // F
      buffer[8] === 0x57 && // W
      buffer[9] === 0x45 && // E
      buffer[10] === 0x42 && // B
      buffer[11] === 0x50 // P
    );
  }
  return false;
}
