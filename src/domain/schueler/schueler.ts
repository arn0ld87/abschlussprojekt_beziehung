import { z } from 'zod';

export const SchuelerSchema = z.object({
  id: z.string().min(1),
  klasseId: z.string().min(1),
  name: z.string().min(1).max(100),
  initialen: z.string().min(1).max(10),
  farbe: z.string().min(1).max(30),
  lernstand: z.string().max(2000).nullable(),
  verhalten: z.string().max(2000).nullable(),
  freitextnotizen: z.string().max(4000).nullable(),
  fotoPlaceholderId: z.string().nullable(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  deletedAt: z.union([z.date(), z.string()]).nullable(),
});

export type Schueler = z.infer<typeof SchuelerSchema>;

export const CreateSchuelerInputSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich.').max(100, 'Name darf maximal 100 Zeichen haben.'),
  initialen: z.string().trim().min(1).max(10).optional(),
  farbe: z.string().trim().min(1).max(30).optional(),
  lernstand: z.string().trim().max(2000, 'Lernstand darf maximal 2000 Zeichen haben.').nullable().optional(),
  verhalten: z.string().trim().max(2000, 'Verhalten darf maximal 2000 Zeichen haben.').nullable().optional(),
  freitextnotizen: z.string().trim().max(4000, 'Notizen dürfen maximal 4000 Zeichen haben.').nullable().optional(),
  fotoPlaceholderId: z.string().nullable().optional(),
});

export type CreateSchuelerInput = z.infer<typeof CreateSchuelerInputSchema>;

export const UpdateSchuelerInputSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich.').max(100, 'Name darf maximal 100 Zeichen haben.').optional(),
  initialen: z.string().trim().min(1).max(10).optional(),
  farbe: z.string().trim().min(1).max(30).optional(),
  lernstand: z.string().trim().max(2000, 'Lernstand darf maximal 2000 Zeichen haben.').nullable().optional(),
  verhalten: z.string().trim().max(2000, 'Verhalten darf maximal 2000 Zeichen haben.').nullable().optional(),
  freitextnotizen: z.string().trim().max(4000, 'Notizen dürfen maximal 4000 Zeichen haben.').nullable().optional(),
  fotoPlaceholderId: z.string().nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Mindestens ein Feld muss angegeben werden.' }
);

export type UpdateSchuelerInput = z.infer<typeof UpdateSchuelerInputSchema>;

export function autoGenerateInitialen(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const DEFAULT_FARBEN = [
  '#4F46E5', '#0284C7', '#0D9488', '#16A34A',
  '#CA8A04', '#EA580C', '#E11D48', '#9333EA',
];
