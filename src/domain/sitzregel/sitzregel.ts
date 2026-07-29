import { z } from 'zod';

export const SitzregelTypSchema = z.enum(['front_seat', 'quiet_area', 'near_to', 'away_from']);
export type SitzregelTyp = z.infer<typeof SitzregelTypSchema>;

export const SitzregelHaerteSchema = z.enum(['hard', 'weighted']);
export type SitzregelHaerte = z.infer<typeof SitzregelHaerteSchema>;

export const SitzregelSchema = z.object({
  id: z.string().min(1),
  schuelerId: z.string().min(1),
  klasseId: z.string().min(1),
  typ: SitzregelTypSchema,
  targetSchuelerId: z.string().nullable(),
  haerte: SitzregelHaerteSchema,
  gewicht: z.number().min(0).max(1).nullable(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});

export type Sitzregel = z.infer<typeof SitzregelSchema>;

export const CreateSitzregelInputSchema = z.object({
  typ: SitzregelTypSchema,
  targetSchuelerId: z.string().trim().nullable().optional(),
  haerte: SitzregelHaerteSchema,
  gewicht: z.number().min(0, 'Gewicht muss mindestens 0 sein.').max(1, 'Gewicht darf maximal 1 sein.').nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.typ === 'near_to' || data.typ === 'away_from') {
    if (!data.targetSchuelerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Für Peer-Regeln muss ein Ziel-Schüler angegeben werden.',
        path: ['targetSchuelerId'],
      });
    }
  } else {
    if (data.targetSchuelerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Positionsregeln dürfen keinen Ziel-Schüler haben.',
        path: ['targetSchuelerId'],
      });
    }
  }

  if (data.haerte === 'hard') {
    if (data.gewicht !== undefined && data.gewicht !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Harte Regeln dürfen kein Gewicht haben.',
        path: ['gewicht'],
      });
    }
  } else if (data.haerte === 'weighted') {
    if (data.gewicht === undefined || data.gewicht === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Gewichtete Regeln benötigen ein Gewicht zwischen 0 und 1.',
        path: ['gewicht'],
      });
    }
  }
});

export type CreateSitzregelInput = z.infer<typeof CreateSitzregelInputSchema>;

export const UpdateSitzregelInputSchema = z.object({
  typ: SitzregelTypSchema.optional(),
  targetSchuelerId: z.string().trim().nullable().optional(),
  haerte: SitzregelHaerteSchema.optional(),
  gewicht: z.number().min(0).max(1).nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.haerte === 'hard' && data.gewicht !== undefined && data.gewicht !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Harte Regeln dürfen kein Gewicht haben.',
      path: ['gewicht'],
    });
  }
  if (data.haerte === 'weighted' && data.gewicht === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Gewichtete Regeln benötigen ein Gewicht zwischen 0 und 1.',
      path: ['gewicht'],
    });
  }
});

export type UpdateSitzregelInput = z.infer<typeof UpdateSitzregelInputSchema>;
