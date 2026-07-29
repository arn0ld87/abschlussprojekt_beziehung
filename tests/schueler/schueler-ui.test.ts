import { describe, it, expect } from 'vitest';
import { autoGenerateInitialen } from '../../src/domain/schueler';

describe('Schueler UI Utilities', () => {
  it('correctly generates initialen from single or multi-part names', () => {
    expect(autoGenerateInitialen('Max Mustermann')).toBe('MM');
    expect(autoGenerateInitialen('Anna-Maria Schmidt')).toBe('AS');
    expect(autoGenerateInitialen('Lukas')).toBe('LU');
    expect(autoGenerateInitialen('  John  Doe  ')).toBe('JD');
  });
});
