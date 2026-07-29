import { CreateSchuelerInput, CreateSchuelerInputSchema } from '../schueler/schueler';
import { CreateSitzregelInput, CreateSitzregelInputSchema, SitzregelTypSchema } from '../sitzregel/sitzregel';

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
      const typResult = SitzregelTypSchema.safeParse(part);
      if (!typResult.success) {
        errors.push(`Sitzregel unbekannt: ${part}`);
        continue;
      }
      const typ = typResult.data;
      if (typ === 'near_to' || typ === 'away_from') {
        errors.push(`Sitzregel ${typ} braucht einen Ziel-Schüler — im CSV-Import nicht unterstützt.`);
        continue;
      }
      const parsedSr = CreateSitzregelInputSchema.safeParse({ typ, haerte: 'hard' });
      if (parsedSr.success) {
        sitzregeln.push(parsedSr.data as CreateSitzregelInput);
      } else {
        errors.push(`Sitzregel ungültig: ${part}`);
      }
    }
  }

  return { raw: row, schueler, sitzregeln, errors };
}
