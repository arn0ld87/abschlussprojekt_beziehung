import { CsvImportService } from '../../domain/csv-import';
import { getDefaultSchuelerService } from '../schueler';
import { getDefaultSitzregelService } from '../sitzregel';

let globalService: CsvImportService | null = null;
let testDefaultService: CsvImportService | null = null;

export function setGlobalCsvImportService(service: CsvImportService | null) {
  globalService = service;
}

export function getDefaultCsvImportService(): CsvImportService {
  if (globalService) {
    return globalService;
  }

  if (process.env.VITEST) {
    if (!testDefaultService) {
      testDefaultService = new CsvImportService(
        getDefaultSchuelerService(),
        getDefaultSitzregelService()
      );
    }
    return testDefaultService;
  }

  return new CsvImportService(
    getDefaultSchuelerService(),
    getDefaultSitzregelService()
  );
}
