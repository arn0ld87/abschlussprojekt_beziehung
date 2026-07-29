import { RaumService } from '../../domain/raum';
import { DrizzleRaumRepository } from '../../infrastructure/db/raum-repository';
import { InMemoryRaumRepository } from '../../infrastructure/db/in-memory-raum-repository';

let globalService: RaumService | null = null;
let testDefaultService: RaumService | null = null;

export function setGlobalRaumService(service: RaumService | null) {
  globalService = service;
}

export function getDefaultRaumService(): RaumService {
  if (globalService) {
    return globalService;
  }

  if (process.env.VITEST) {
    if (!testDefaultService) {
      testDefaultService = new RaumService(new InMemoryRaumRepository());
    }
    return testDefaultService;
  }

  return new RaumService(new DrizzleRaumRepository());
}
