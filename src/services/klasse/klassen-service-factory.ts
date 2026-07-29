import { KlassenService } from '../../domain/klasse';
import { DrizzleKlassenRepository } from '../../infrastructure/db/klassen-repository';
import { InMemoryKlassenRepository } from '../../infrastructure/db/in-memory-klassen-repository';

let globalService: KlassenService | null = null;
let testDefaultService: KlassenService | null = null;

export function setGlobalKlassenService(service: KlassenService | null) {
  globalService = service;
}

export function getDefaultKlassenService(): KlassenService {
  if (globalService) {
    return globalService;
  }

  if (process.env.VITEST) {
    if (!testDefaultService) {
      testDefaultService = new KlassenService(new InMemoryKlassenRepository());
    }
    return testDefaultService;
  }

  return new KlassenService(new DrizzleKlassenRepository());
}
