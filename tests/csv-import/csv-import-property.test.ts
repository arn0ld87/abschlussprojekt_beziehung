import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseCsv } from '../../src/domain/csv-import/csv-parser';

describe('CSV Parser Property Tests', () => {
  it('should preserve row count when parsing generated valid CSV strings without internal newlines', () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.string({ maxLength: 20 }).filter(s => !s.includes('\\n') && !s.includes('\\r') && !s.includes('"') && !s.includes(',') && !s.includes(';')), { minLength: 2, maxLength: 5 }), { minLength: 2, maxLength: 10 }),
        (data) => {
          const csvText = data.map(row => row.join(',')).join('\\n');
          const result = parseCsv(csvText);
          expect(result.length).toBe(data.length - 1); // minus header
        }
      )
    );
  });
});
