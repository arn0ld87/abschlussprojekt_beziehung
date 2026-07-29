import { z } from "zod";

export const SessionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  expiresAt: z.date(),
  createdAt: z.date(),
});

export type Session = z.infer<typeof SessionSchema>;
