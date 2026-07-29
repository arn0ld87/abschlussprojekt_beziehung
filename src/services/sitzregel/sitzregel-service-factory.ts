import { SitzregelService } from '../../domain/sitzregel';
import { DrizzleSitzregelRepository } from '../../infrastructure/db/sitzregel-repository';
import { InMemorySitzregelRepository } from '../../infrastructure/db/in-memory-sitzregel-repository';
import { getDefaultSchuelerService } from '../schueler';
import { getDefaultKlassenService } from '../klasse';

let globalService: SitzregelService | null = null;
let testDefaultService: SitzregelService | null = null;

export function setGlobalSitzregelService(service: SitzregelService | null) {
  globalService = service;
}

export function getDefaultSitzregelService(): SitzregelService {
  if (globalService) {
    return globalService;
  }

  if (process.env.VITEST) {
    if (!testDefaultService) {
      testDefaultService = new SitzregelService(
        new InMemorySitzregelRepository(),
        getDefaultSchuelerService(),
        getDefaultKlassenService()
      );
    }
    return testDefaultService;
  }

  return new SitzregelService(
    new DrizzleSitzregelRepository(),
    getDefaultSchuelerService(),
    getDefaultKlassenService()
  );
}
