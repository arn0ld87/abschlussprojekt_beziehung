import { z } from "zod";

export const SessionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  expiresAt: z.union([z.date(), z.string()]),
  createdAt: z.union([z.date(), z.string()]),
});

export type Session = z.infer<typeof SessionSchema>;
