import { z } from "zod";

export const FotoSchema = z.object({
  id: z.string().min(1),
  schuelerId: z.string().min(1),
  pfad: z.string().min(1),
  mimeType: z.string().startsWith("image/"),
  groesse: z.number().int().positive().max(5 * 1024 * 1024),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Foto = z.infer<typeof FotoSchema>;
