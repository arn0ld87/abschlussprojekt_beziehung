import { describe, it, expect } from 'vitest';
import {
  setzeSchueler,
  tausche,
  entferne,
  sortiereZuordnungen,
  ablageSchuelerIds,
  ermittleBefunde,
} from '../../src/domain/sitzplan/zuordnung-commands';
import type { Zuordnung } from '../../src/domain/sitzplan';

// Framework-freie Zuordnungs-Commands (M3 #57): reine Funktionen auf der
// normalisierten Zuordnungsliste. Kein React, kein Konva, keine Persistenz.
// Die drei harten Invarianten (bekannter Sitzplatz, höchstens ein Schüler je
// Sitzplatz, höchstens ein Sitzplatz je Schüler) gelten nach jedem Command.

const A = 'obj_1__sitz_1';
const B = 'obj_1__sitz_2';
const C = 'obj_2__sitz_1';

describe('Zuordnungs-Commands (M3 #57)', () => {
  describe('sortiereZuordnungen', () => {
    it('sortiert deterministisch nach sitzplatzId, ohne die Eingabe zu verändern', () => {
      const eingabe: Zuordnung[] = [
        { sitzplatzId: C, schuelerId: 's3' },
        { sitzplatzId: A, schuelerId: 's1' },
        { sitzplatzId: B, schuelerId: 's2' },
      ];
      const kopie = structuredClone(eingabe);

      expect(sortiereZuordnungen(eingabe).map((z) => z.sitzplatzId)).toEqual([A, B, C]);
      expect(eingabe).toEqual(kopie);
    });
  });

  describe('setzeSchueler', () => {
    it('belegt einen freien Platz', () => {
      expect(setzeSchueler([], { schuelerId: 's1', sitzplatzId: A })).toEqual([
        { sitzplatzId: A, schuelerId: 's1' },
      ]);
    });

    it('setzt einen bereits sitzenden Schüler um, statt ihn zu duplizieren', () => {
      const vorher = setzeSchueler([], { schuelerId: 's1', sitzplatzId: A });
      const nachher = setzeSchueler(vorher, { schuelerId: 's1', sitzplatzId: B });

      expect(nachher).toEqual([{ sitzplatzId: B, schuelerId: 's1' }]);
      expect(nachher.filter((z) => z.schuelerId === 's1')).toHaveLength(1);
    });

    it('verdrängt einen bisherigen Platzinhaber in die Ablage', () => {
      const vorher = setzeSchueler([], { schuelerId: 's1', sitzplatzId: A });
      const nachher = setzeSchueler(vorher, { schuelerId: 's2', sitzplatzId: A });

      expect(nachher).toEqual([{ sitzplatzId: A, schuelerId: 's2' }]);
    });

    it('ist idempotent für dieselbe Zuordnung', () => {
      const einmal = setzeSchueler([], { schuelerId: 's1', sitzplatzId: A });
      expect(setzeSchueler(einmal, { schuelerId: 's1', sitzplatzId: A })).toEqual(einmal);
    });

    it('mutiert die Eingabeliste nicht', () => {
      const eingabe: Zuordnung[] = [{ sitzplatzId: A, schuelerId: 's1' }];
      setzeSchueler(eingabe, { schuelerId: 's2', sitzplatzId: A });
      expect(eingabe).toEqual([{ sitzplatzId: A, schuelerId: 's1' }]);
    });
  });

  describe('tausche', () => {
    it('tauscht zwei belegte Plätze atomar', () => {
      const vorher = sortiereZuordnungen([
        { sitzplatzId: A, schuelerId: 's1' },
        { sitzplatzId: B, schuelerId: 's2' },
      ]);

      expect(tausche(vorher, A, B)).toEqual([
        { sitzplatzId: A, schuelerId: 's2' },
        { sitzplatzId: B, schuelerId: 's1' },
      ]);
    });

    it('verschiebt, wenn nur einer der beiden Plätze belegt ist', () => {
      const vorher: Zuordnung[] = [{ sitzplatzId: A, schuelerId: 's1' }];
      expect(tausche(vorher, A, B)).toEqual([{ sitzplatzId: B, schuelerId: 's1' }]);
      expect(tausche(vorher, B, A)).toEqual([{ sitzplatzId: B, schuelerId: 's1' }]);
    });

    it('lässt zwei freie Plätze und den Tausch mit sich selbst unverändert', () => {
      const vorher: Zuordnung[] = [{ sitzplatzId: A, schuelerId: 's1' }];
      expect(tausche(vorher, B, C)).toEqual(vorher);
      expect(tausche(vorher, A, A)).toEqual(vorher);
    });

    it('ist selbstinvers', () => {
      const vorher = sortiereZuordnungen([
        { sitzplatzId: A, schuelerId: 's1' },
        { sitzplatzId: B, schuelerId: 's2' },
      ]);
      expect(tausche(tausche(vorher, A, B), A, B)).toEqual(vorher);
    });

    it('mutiert die Eingabeliste nicht', () => {
      const eingabe: Zuordnung[] = [{ sitzplatzId: A, schuelerId: 's1' }];
      tausche(eingabe, A, B);
      expect(eingabe).toEqual([{ sitzplatzId: A, schuelerId: 's1' }]);
    });
  });

  describe('entferne', () => {
    it('legt genau einen Schüler zurück in die Ablage', () => {
      const vorher = sortiereZuordnungen([
        { sitzplatzId: A, schuelerId: 's1' },
        { sitzplatzId: B, schuelerId: 's2' },
      ]);
      expect(entferne(vorher, 's1')).toEqual([{ sitzplatzId: B, schuelerId: 's2' }]);
    });

    it('ist für einen nicht sitzenden Schüler folgenlos und mutiert nicht', () => {
      const eingabe: Zuordnung[] = [{ sitzplatzId: A, schuelerId: 's1' }];
      expect(entferne(eingabe, 's9')).toEqual(eingabe);
      expect(eingabe).toEqual([{ sitzplatzId: A, schuelerId: 's1' }]);
    });
  });

  describe('ablageSchuelerIds', () => {
    it('liefert genau die aktiven Schüler ohne Sitzplatz, in Eingabereihenfolge', () => {
      const zuordnungen: Zuordnung[] = [{ sitzplatzId: A, schuelerId: 's2' }];
      expect(ablageSchuelerIds(['s1', 's2', 's3'], zuordnungen)).toEqual(['s1', 's3']);
    });

    it('ist leer, wenn alle aktiven Schüler sitzen', () => {
      const zuordnungen = sortiereZuordnungen([
        { sitzplatzId: A, schuelerId: 's1' },
        { sitzplatzId: B, schuelerId: 's2' },
      ]);
      expect(ablageSchuelerIds(['s1', 's2'], zuordnungen)).toEqual([]);
    });
  });

  describe('ermittleBefunde', () => {
    it('meldet Zuordnungen auf nicht mehr aktive Schülerprofile, ohne sie zu entfernen', () => {
      const zuordnungen = sortiereZuordnungen([
        { sitzplatzId: A, schuelerId: 's1' },
        { sitzplatzId: B, schuelerId: 's_geloescht' },
      ]);

      const befunde = ermittleBefunde(zuordnungen, ['s1']);
      expect(befunde).toHaveLength(1);
      expect(befunde[0].code).toBe('SCHUELER_NICHT_AKTIV');
      expect(befunde[0].sitzplatzId).toBe(B);
      expect(befunde[0].schuelerId).toBe('s_geloescht');
      expect(befunde[0].meldung).toMatch(/nicht mehr aktiv/i);
    });

    it('ist leer, wenn alle Zuordnungen auf aktive Schülerprofile zeigen', () => {
      expect(ermittleBefunde([{ sitzplatzId: A, schuelerId: 's1' }], ['s1', 's2'])).toEqual([]);
    });
  });
});
