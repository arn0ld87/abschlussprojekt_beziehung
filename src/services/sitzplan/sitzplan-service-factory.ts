import { SitzplanService } from '../../domain/sitzplan';
import { DrizzleSitzplanRepository } from '../../infrastructure/db/sitzplan-repository';
import { InMemorySitzplanRepository } from '../../infrastructure/db/in-memory-sitzplan-repository';
import { getDefaultKlassenService } from '../klasse';
import { getDefaultRaumService } from '../raum';
import { getDefaultSchuelerService } from '../schueler';

let globalService: SitzplanService | null = null;
let testDefaultService: SitzplanService | null = null;

export function setGlobalSitzplanService(service: SitzplanService | null) {
  globalService = service;
}

export function getDefaultSitzplanService(): SitzplanService {
  if (globalService) {
    return globalService;
  }

  // Klassen- und Raum-Dienste werden wiederverwendet, damit Ownership-,
  // Existenz- und Soft-Delete-Prüfung genau einmal existieren.
  if (process.env.VITEST) {
    if (!testDefaultService) {
      testDefaultService = new SitzplanService(
        new InMemorySitzplanRepository(),
        getDefaultKlassenService(),
        getDefaultRaumService(),
        getDefaultSchuelerService(),
      );
    }
    return testDefaultService;
  }

  return new SitzplanService(
    new DrizzleSitzplanRepository(),
    getDefaultKlassenService(),
    getDefaultRaumService(),
    getDefaultSchuelerService(),
  );
}
