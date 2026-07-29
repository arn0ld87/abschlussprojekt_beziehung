import { z } from 'zod';

export const KlasseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  notizen: z.string().max(2000).nullable(),
  userId: z.string().min(1),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  deletedAt: z.union([z.date(), z.string()]).nullable(),
});

export type Klasse = z.infer<typeof KlasseSchema>;

export const CreateKlasseInputSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich.').max(100, 'Name darf maximal 100 Zeichen haben.'),
  notizen: z.string().trim().max(2000, 'Notizen dürfen maximal 2000 Zeichen haben.').optional(),
});

export type CreateKlasseInput = z.infer<typeof CreateKlasseInputSchema>;

export const UpdateKlasseInputSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich.').max(100, 'Name darf maximal 100 Zeichen haben.').optional(),
  notizen: z.string().trim().max(2000, 'Notizen dürfen maximal 2000 Zeichen haben.').nullable().optional(),
}).refine(
  (data) => data.name !== undefined || data.notizen !== undefined,
  { message: 'Mindestens ein Feld muss angegeben werden.' }
);

export type UpdateKlasseInput = z.infer<typeof UpdateKlasseInputSchema>;
