import { describe, it, expect } from 'vitest';
import { SitzregelService } from '../../src/domain/sitzregel';
import { SchuelerService } from '../../src/domain/schueler';
import { KlassenService } from '../../src/domain/klasse';
import { InMemoryKlassenRepository } from '../../src/infrastructure/db/in-memory-klassen-repository';
import { InMemorySchuelerRepository } from '../../src/infrastructure/db/in-memory-schueler-repository';
import { InMemorySitzregelRepository } from '../../src/infrastructure/db/in-memory-sitzregel-repository';

describe('Sitzregel Property Tests', () => {
  it('enforces symmetry and duplicate checks for peer rules across randomized student pairs', async () => {
    const klassenRepo = new InMemoryKlassenRepository();
    const klassenService = new KlassenService(klassenRepo);
    const schuelerRepo = new InMemorySchuelerRepository();
    const schuelerService = new SchuelerService(schuelerRepo, klassenService);
    const sitzregelRepo = new InMemorySitzregelRepository();
    const sitzregelService = new SitzregelService(sitzregelRepo, schuelerService, klassenService);

    const userId = 'u1';
    const k = await klassenService.create(userId, { name: 'Klasse 9a' });

    // Create 10 students
    const students = [];
    for (let i = 0; i < 10; i++) {
      const s = await schuelerService.create(userId, k.id, { name: `Schueler_${i}` });
      students.push(s);
    }

    // Property 1: No student can have a peer rule with themselves
    for (const s of students) {
      await expect(
        sitzregelService.create(userId, k.id, s.id, {
          typ: 'near_to',
          targetSchuelerId: s.id,
          haerte: 'hard',
        })
      ).rejects.toThrow();
    }

    // Property 2: Adding near_to(A, B) prevents near_to(B, A) and duplicate near_to(A, B)
    const sA = students[0];
    const sB = students[1];

    await sitzregelService.create(userId, k.id, sA.id, {
      typ: 'near_to',
      targetSchuelerId: sB.id,
      haerte: 'hard',
    });

    // Duplicate A -> B
    await expect(
      sitzregelService.create(userId, k.id, sA.id, {
        typ: 'near_to',
        targetSchuelerId: sB.id,
        haerte: 'weighted',
        gewicht: 0.5,
      })
    ).rejects.toThrow();

    // Symmetric B -> A
    await expect(
      sitzregelService.create(userId, k.id, sB.id, {
        typ: 'near_to',
        targetSchuelerId: sA.id,
        haerte: 'hard',
      })
    ).rejects.toThrow();
  });
});
