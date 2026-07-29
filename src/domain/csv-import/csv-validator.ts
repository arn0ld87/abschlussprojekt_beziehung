import { CreateSchuelerInput, CreateSchuelerInputSchema } from '../schueler/schueler';
import { CreateSitzregelInput, CreateSitzregelInputSchema } from '../sitzregel/sitzregel';

export type CsvImportRowResult = {
  raw: Record<string, string>;
  schueler: CreateSchuelerInput | null;
  sitzregeln: CreateSitzregelInput[];
  errors: string[];
};

export function validateCsvRow(row: Record<string, string>): CsvImportRowResult {
  const errors: string[] = [];

  const schuelerInput: Record<string, string | undefined> = {
    name: row['Name'] || row['name'] || '',
    initialen: row['Initialen'] || row['initialen'] || undefined,
    farbe: row['Farbe'] || row['farbe'] || undefined,
    lernstand: row['Lernstand'] || row['lernstand'] || undefined,
    verhalten: row['Verhalten'] || row['verhalten'] || undefined,
    freitextnotizen: row['Freitextnotizen'] || row['freitextnotizen'] || row['Notizen'] || undefined,
  };

  Object.keys(schuelerInput).forEach((key) => {
    if (schuelerInput[key] === '') schuelerInput[key] = undefined;
  });

  const parsedSchueler = CreateSchuelerInputSchema.safeParse(schuelerInput);
  let schueler: CreateSchuelerInput | null = null;

  if (parsedSchueler.success) {
    schueler = parsedSchueler.data;
  } else {
    parsedSchueler.error.errors.forEach((e) => {
      errors.push(`Schüler: ${e.path.join('.')}: ${e.message}`);
    });
  }

  const sitzregeln: CreateSitzregelInput[] = [];
  const sitzregelnStr = row['Sitzregeln'] || row['sitzregeln'] || '';
  if (sitzregelnStr) {
    const parts = sitzregelnStr.split(',').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part === 'front_seat' || part === 'quiet_area') {
        const parsedSr = CreateSitzregelInputSchema.safeParse({ typ: part, haerte: 'hard' });
        if (parsedSr.success) {
          sitzregeln.push(parsedSr.data as CreateSitzregelInput);
        } else {
          errors.push(`Sitzregel ungültig: ${part}`);
        }
      } else {
        errors.push(`Sitzregel unbekannt: ${part}`);
      }
    }
  }

  return { raw: row, schueler, sitzregeln, errors };
}
