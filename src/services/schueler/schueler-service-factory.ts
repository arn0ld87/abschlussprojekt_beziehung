import { SchuelerService } from '../../domain/schueler';
import { DrizzleSchuelerRepository } from '../../infrastructure/db/schueler-repository';
import { InMemorySchuelerRepository } from '../../infrastructure/db/in-memory-schueler-repository';
import { getDefaultKlassenService } from '../klasse';

let globalService: SchuelerService | null = null;
let testDefaultService: SchuelerService | null = null;

export function setGlobalSchuelerService(service: SchuelerService | null) {
  globalService = service;
}

export function getDefaultSchuelerService(): SchuelerService {
  if (globalService) {
    return globalService;
  }

  if (process.env.VITEST) {
    if (!testDefaultService) {
      testDefaultService = new SchuelerService(
        new InMemorySchuelerRepository(),
        getDefaultKlassenService()
      );
    }
    return testDefaultService;
  }

  return new SchuelerService(
    new DrizzleSchuelerRepository(),
    getDefaultKlassenService()
  );
}
