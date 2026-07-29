import { describe, it, expect } from 'vitest';
import { parseCsv } from '../../src/domain/csv-import';

describe('CSV Parser', () => {
  it('parses comma separated values', () => {
    const csv = `Name,Initialen\nJohn Doe,JD\nJane Doe,JD`;
    const result = parseCsv(csv);
    expect(result).toHaveLength(2);
    expect(result[0].Name).toBe('John Doe');
    expect(result[0].Initialen).toBe('JD');
  });

  it('parses semicolon separated values', () => {
    const csv = `Name;Initialen\nJohn Doe;JD\nJane Doe;JD`;
    const result = parseCsv(csv);
    expect(result[0].Name).toBe('John Doe');
  });

  it('handles quotes', () => {
    const csv = `Name,Notizen\n"Doe, John","Ein ""Test"" Notiz"`;
    const result = parseCsv(csv);
    expect(result[0].Name).toBe('Doe, John');
    expect(result[0].Notizen).toBe('Ein "Test" Notiz');
  });

  it('ignores empty lines', () => {
    const csv = `Name,Initialen\nJohn,J\n\n\nJane,J`;
    const result = parseCsv(csv);
    expect(result).toHaveLength(2);
  });
});
