import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchuelerService } from '../../src/domain/schueler';
import { SitzregelService, SitzregelError } from '../../src/domain/sitzregel';
import { KlassenService } from '../../src/domain/klasse';
import { InMemoryKlassenRepository } from '../../src/infrastructure/db/in-memory-klassen-repository';
import { InMemorySchuelerRepository } from '../../src/infrastructure/db/in-memory-schueler-repository';
import { InMemorySitzregelRepository } from '../../src/infrastructure/db/in-memory-sitzregel-repository';

describe('SitzregelService (Extended Coverage)', () => {
  let klassenRepo: InMemoryKlassenRepository;
  let klassenService: KlassenService;
  let schuelerRepo: InMemorySchuelerRepository;
  let schuelerService: SchuelerService;
  let sitzregelRepo: InMemorySitzregelRepository;
  let sitzregelService: SitzregelService;

  beforeEach(() => {
    klassenRepo = new InMemoryKlassenRepository();
    klassenService = new KlassenService(klassenRepo);
    schuelerRepo = new InMemorySchuelerRepository();
    schuelerService = new SchuelerService(schuelerRepo, klassenService);
    sitzregelRepo = new InMemorySitzregelRepository();
    sitzregelService = new SitzregelService(sitzregelRepo, schuelerService, klassenService);
  });

  describe('listForSchueler', () => {
    it('returns rules only for the requested student', async () => {
      const k = await klassenService.create('u1', { name: '8a' });
      const s1 = await schuelerService.create('u1', k.id, { name: 'Max' });
      const s2 = await schuelerService.create('u1', k.id, { name: 'Anna' });

      await sitzregelService.create('u1', k.id, s1.id, { typ: 'front_seat', haerte: 'hard' });
      await sitzregelService.create('u1', k.id, s2.id, { typ: 'quiet_area', haerte: 'hard' });

      const rulesS1 = await sitzregelService.listForSchueler('u1', k.id, s1.id);
      expect(rulesS1).toHaveLength(1);
      expect(rulesS1[0].typ).toBe('front_seat');
      expect(rulesS1[0].schuelerId).toBe(s1.id);
    });
  });

  describe('listForKlasse', () => {
    it('returns all rules within a class', async () => {
      const k = await klassenService.create('u1', { name: '8a' });
      const s1 = await schuelerService.create('u1', k.id, { name: 'Max' });
      const s2 = await schuelerService.create('u1', k.id, { name: 'Anna' });

      await sitzregelService.create('u1', k.id, s1.id, { typ: 'front_seat', haerte: 'hard' });
      await sitzregelService.create('u1', k.id, s2.id, { typ: 'quiet_area', haerte: 'hard' });

      const rules = await sitzregelService.listForKlasse('u1', k.id);
      expect(rules).toHaveLength(2);
      expect(rules.map((r) => r.typ)).toContain('front_seat');
      expect(rules.map((r) => r.typ)).toContain('quiet_area');
    });
  });

  describe('delete', () => {
    it('correctly deletes a rule', async () => {
      const k = await klassenService.create('u1', { name: '8a' });
      const s = await schuelerService.create('u1', k.id, { name: 'Max' });
      const r = await sitzregelService.create('u1', k.id, s.id, { typ: 'front_seat', haerte: 'hard' });

      await sitzregelService.delete('u1', k.id, s.id, r.id);

      const rules = await sitzregelService.listForSchueler('u1', k.id, s.id);
      expect(rules).toHaveLength(0);
    });
  });

  describe('NOT_FOUND', () => {
    it('throws NOT_FOUND when updating a non-existent rule', async () => {
      const k = await klassenService.create('u1', { name: '8a' });
      const s = await schuelerService.create('u1', k.id, { name: 'Max' });

      await expect(
        sitzregelService.update('u1', k.id, s.id, 'stz_invalid', { haerte: 'hard' })
      ).rejects.toThrowError(new SitzregelError('NOT_FOUND', 'Sitzregel nicht gefunden.'));
    });

    it('throws NOT_FOUND when deleting a non-existent rule', async () => {
      const k = await klassenService.create('u1', { name: '8a' });
      const s = await schuelerService.create('u1', k.id, { name: 'Max' });

      await expect(
        sitzregelService.delete('u1', k.id, s.id, 'stz_invalid')
      ).rejects.toThrowError(new SitzregelError('NOT_FOUND', 'Sitzregel nicht gefunden.'));
    });
  });

  describe('FORBIDDEN', () => {
    it('throws FORBIDDEN when updating a rule that belongs to another student', async () => {
      const k = await klassenService.create('u1', { name: '8a' });
      const s1 = await schuelerService.create('u1', k.id, { name: 'Max' });
      const s2 = await schuelerService.create('u1', k.id, { name: 'Anna' });

      const r = await sitzregelService.create('u1', k.id, s1.id, { typ: 'front_seat', haerte: 'hard' });

      await expect(
        sitzregelService.update('u1', k.id, s2.id, r.id, { typ: 'quiet_area' })
      ).rejects.toThrowError(new SitzregelError('FORBIDDEN', 'Keine Berechtigung für diese Sitzregel.'));
    });

    it('throws FORBIDDEN when deleting a rule that belongs to another student', async () => {
      const k = await klassenService.create('u1', { name: '8a' });
      const s1 = await schuelerService.create('u1', k.id, { name: 'Max' });
      const s2 = await schuelerService.create('u1', k.id, { name: 'Anna' });

      const r = await sitzregelService.create('u1', k.id, s1.id, { typ: 'front_seat', haerte: 'hard' });

      await expect(
        sitzregelService.delete('u1', k.id, s2.id, r.id)
      ).rejects.toThrowError(new SitzregelError('FORBIDDEN', 'Keine Berechtigung für diese Sitzregel.'));
    });
  });

  describe('invalid input', () => {
    it('throws VALIDATION_ERROR on create with invalid input', async () => {
      const k = await klassenService.create('u1', { name: '8a' });
      const s = await schuelerService.create('u1', k.id, { name: 'Max' });

      await expect(
        sitzregelService.create('u1', k.id, s.id, { typ: 'near_to', haerte: 'hard' }) // missing targetSchuelerId
      ).rejects.toThrowError(SitzregelError);
    });

    it('throws VALIDATION_ERROR on update with invalid input', async () => {
      const k = await klassenService.create('u1', { name: '8a' });
      const s = await schuelerService.create('u1', k.id, { name: 'Max' });
      const r = await sitzregelService.create('u1', k.id, s.id, { typ: 'front_seat', haerte: 'hard' });

      await expect(
        sitzregelService.update('u1', k.id, s.id, r.id, { haerte: 'hard', gewicht: 0.5 }) // hard rules shouldn't have gewicht
      ).rejects.toThrowError(SitzregelError);
    });
  });

  describe('weighted-to-hard weight normalization', () => {
    it('normalizes weight to null when updating from weighted to hard', async () => {
      const k = await klassenService.create('u1', { name: '8a' });
      const s1 = await schuelerService.create('u1', k.id, { name: 'Max' });
      const s2 = await schuelerService.create('u1', k.id, { name: 'Anna' });

      const r = await sitzregelService.create('u1', k.id, s1.id, {
        typ: 'near_to',
        targetSchuelerId: s2.id,
        haerte: 'weighted',
        gewicht: 0.8,
      });
      expect(r.gewicht).toBe(0.8);

      const updated = await sitzregelService.update('u1', k.id, s1.id, r.id, {
        haerte: 'hard',
      });

      expect(updated.haerte).toBe('hard');
      expect(updated.gewicht).toBeNull();
    });
  });

  describe('repository failures', () => {
    it('propagates errors from repository on create', async () => {
      const k = await klassenService.create('u1', { name: '8a' });
      const s = await schuelerService.create('u1', k.id, { name: 'Max' });

      vi.spyOn(sitzregelRepo, 'findAllByKlasseId').mockRejectedValue(new Error('DB Error'));

      await expect(
        sitzregelService.create('u1', k.id, s.id, { typ: 'front_seat', haerte: 'hard' })
      ).rejects.toThrowError('DB Error');

      vi.restoreAllMocks();
    });
  });
});
