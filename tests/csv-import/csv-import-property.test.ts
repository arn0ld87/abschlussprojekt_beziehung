import { describe, it, expect } from 'vitest';
import { parseCsv } from '../../src/domain/csv-import/csv-parser';

describe('CSV Parser Property Tests', () => {
  it('should preserve row count when parsing generated valid CSV strings without internal newlines', () => {
    // Generate 50 randomized CSV data matrices
    for (let run = 0; run < 50; run++) {
      const numRows = Math.floor(Math.random() * 8) + 2; // 2 to 9 rows
      const data: string[][] = [];

      for (let r = 0; r < numRows; r++) {
        const name = `Schueler_${run}_${r}`;
        const initialen = `S${r}`;
        data.push([name, initialen]);
      }

      const header = 'name,initialen';
      const csvText = [header, ...data.map((row) => row.join(','))].join('\n');
      const result = parseCsv(csvText);

      expect(result.length).toBe(numRows);
    }
  });

  it('is order-invariant for student list parsed from CSV', () => {
    for (let run = 0; run < 20; run++) {
      const rows = [
        ['Alice', 'A'],
        ['Bob', 'B'],
        ['Charlie', 'C'],
        ['Dora', 'D'],
      ];

      // Shuffle rows
      const shuffled = [...rows].sort(() => Math.random() - 0.5);
      const csv1 = 'name,initialen\n' + rows.map((r) => r.join(',')).join('\n');
      const csv2 = 'name,initialen\n' + shuffled.map((r) => r.join(',')).join('\n');

      const parsed1 = parseCsv(csv1);
      const parsed2 = parseCsv(csv2);

      expect(parsed1.length).toBe(parsed2.length);

      const names1 = parsed1.map((r) => r['name']).sort();
      const names2 = parsed2.map((r) => r['name']).sort();
      expect(names1).toEqual(names2);
    }
  });
});
