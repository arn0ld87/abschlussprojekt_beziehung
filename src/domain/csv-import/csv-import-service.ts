import { parseCsv } from './csv-parser';
import { validateCsvRow, CsvImportRowResult } from './csv-validator';
import { SchuelerService } from '../schueler/schueler-service';
import { SitzregelService } from '../sitzregel/sitzregel-service';

export type CsvImportPreviewResult = {
  totalRows: number;
  previewRows: CsvImportRowResult[];
};

export type DuplicateStrategy = 'skip' | 'update' | 'duplicate';

export type CsvImportCommitResult = {
  successCount: number;
  skipCount: number;
  updateCount: number;
  errorCount: number;
  errors: string[];
};

export class CsvImportService {
  constructor(
    private readonly schuelerService: SchuelerService,
    private readonly sitzregelService: SitzregelService
  ) {}

  public preview(csvText: string, previewCount = 5): CsvImportPreviewResult {
    const parsed = parseCsv(csvText);
    const totalRows = parsed.length;
    const previewRows = parsed.slice(0, previewCount).map(validateCsvRow);
    
    return {
      totalRows,
      previewRows,
    };
  }

  public async commit(
    userId: string, 
    klasseId: string, 
    csvText: string, 
    strategy: DuplicateStrategy
  ): Promise<CsvImportCommitResult> {
    const parsed = parseCsv(csvText);
    const validated = parsed.map(validateCsvRow);
    
    let successCount = 0;
    let skipCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    const existingSchueler = await this.schuelerService.list(userId, klasseId);
    
    for (let i = 0; i < validated.length; i++) {
      const row = validated[i];
      if (row.errors.length > 0) {
        errorCount++;
        errors.push(`Zeile ${i + 1}: ${row.errors.join(', ')}`);
        continue;
      }
      
      if (!row.schueler) {
        errorCount++;
        errors.push(`Zeile ${i + 1}: Schüler-Daten fehlen.`);
        continue;
      }
      
      const existing = existingSchueler.find(s => s.name === row.schueler!.name);
      
      try {
        let schuelerId: string | null = null;
        
        if (existing) {
          if (strategy === 'skip') {
            skipCount++;
            continue;
          } else if (strategy === 'update') {
            const updated = await this.schuelerService.update(userId, klasseId, existing.id, row.schueler);
            schuelerId = updated.id;
            updateCount++;
          } else if (strategy === 'duplicate') {
            const created = await this.schuelerService.create(userId, klasseId, row.schueler);
            schuelerId = created.id;
            successCount++;
          }
        } else {
          const created = await this.schuelerService.create(userId, klasseId, row.schueler);
          schuelerId = created.id;
          successCount++;
        }
        
        if (schuelerId && row.sitzregeln && row.sitzregeln.length > 0) {
           for (const sr of row.sitzregeln) {
             try {
               await this.sitzregelService.create(userId, klasseId, schuelerId, sr);
             } catch (e: any) {
               errors.push(`Zeile ${i + 1} (Sitzregel): ${e.message}`);
             }
           }
        }
      } catch (e: any) {
        errorCount++;
        errors.push(`Zeile ${i + 1}: ${e.message}`);
      }
    }
    
    return { successCount, skipCount, updateCount, errorCount, errors };
  }
}
