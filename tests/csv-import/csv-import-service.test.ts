import { describe, it, expect, beforeEach } from 'vitest';
import { CsvImportService } from '../../src/domain/csv-import';
import { InMemorySchuelerRepository } from '../../src/infrastructure/db/in-memory-schueler-repository';
import { SchuelerService } from '../../src/domain/schueler';
import { SitzregelService } from '../../src/domain/sitzregel';
import { InMemorySitzregelRepository } from '../../src/infrastructure/db/in-memory-sitzregel-repository';

import { KlassenService } from '../../src/domain/klasse';

// We need a dummy KlassenService.
const dummyKlassenService = {
  getById: async () => ({ id: 'kl1', name: 'Klasse 1' }),
} as unknown as KlassenService;

describe('CsvImportService', () => {
  let schuelerService: SchuelerService;
  let sitzregelService: SitzregelService;
  let csvImportService: CsvImportService;

  beforeEach(() => {
    schuelerService = new SchuelerService(new InMemorySchuelerRepository(), dummyKlassenService);
    sitzregelService = new SitzregelService(new InMemorySitzregelRepository(), schuelerService, dummyKlassenService);
    csvImportService = new CsvImportService(schuelerService, sitzregelService);
  });

  it('previews csv data', () => {
    const csv = `Name,Initialen,Sitzregeln\nMax Mustermann,MM,front_seat`;
    const result = csvImportService.preview(csv, 5);
    expect(result.totalRows).toBe(1);
    expect(result.previewRows[0].schueler?.name).toBe('Max Mustermann');
    expect(result.previewRows[0].sitzregeln[0].typ).toBe('front_seat');
  });

  it('commits csv data', async () => {
    const csv = `Name,Initialen,Sitzregeln\nMax Mustermann,MM,front_seat`;
    const result = await csvImportService.commit('user1', 'kl1', csv, 'skip');

    expect(result.successCount).toBe(1);
    const list = await schuelerService.list('user1', 'kl1');
    expect(list).toHaveLength(1);

    const regeln = await sitzregelService.listForSchueler('user1', 'kl1', list[0].id);
    expect(regeln).toHaveLength(1);
    expect(regeln[0].typ).toBe('front_seat');
  });
});
