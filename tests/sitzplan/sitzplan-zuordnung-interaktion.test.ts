import { describe, it, expect } from 'vitest';
import {
  waehleAusAblage,
  aktiviereSitzplatz,
  legeZurueck,
  dropAufSitzplatz,
  dropAufAblage,
  dragNutzlastSchueler,
  dragNutzlastSitzplatz,
  type Auswahl,
  type InteraktionsZustand,
} from '../../app/(app)/sitzplaene/[id]/_components/zuordnung-interaktion';
import type { Zuordnung } from '../../src/domain/sitzplan';

// Bedienverhalten der Schülerzuordnung (M3 #57). Geprüft wird, was eine
// Bedienhandlung tatsächlich bewirkt — nicht, dass bestimmte Zeichenketten im
// Quelltext stehen. Jeder Fall kann fehlschlagen: Er vergleicht die
// resultierende Zuordnungsliste und die Ansage in der Live-Region.
//
// Der Tastaturweg (Auswahl und Aktion) und der Zeigerweg (Drag-and-drop)
// laufen absichtlich über dieselben Funktionen — deshalb decken dieselben
// Fälle beide Bedienwege ab.

const PLATZ_A = 'obj_1__sitz_1';
const PLATZ_B = 'obj_1__sitz_2';
const PLATZ_C = 'obj_2__sitz_1';

const ANNA = 'sch_anna';
const BRUNO = 'sch_bruno';
const CLARA = 'sch_clara';

function zustand(zuordnungen: Zuordnung[], auswahl: Auswahl = null): InteraktionsZustand {
  return {
    zuordnungen,
    auswahl,
    schuelerNamen: new Map([
      [ANNA, 'Anna Fantasie'],
      [BRUNO, 'Bruno Fantasie'],
      [CLARA, 'Clara Fantasie'],
    ]),
    platzNamen: new Map([
      [PLATZ_A, 'Platz 1'],
      [PLATZ_B, 'Platz 2'],
      [PLATZ_C, 'Platz 3'],
    ]),
  };
}

describe('Bedienung der Schülerzuordnung über Auswahl und Aktion (M3 #57)', () => {
  describe('Ablage → freier Sitzplatz', () => {
    it('setzt den ausgewählten Schüler und sagt es an', () => {
      const nachAuswahl = waehleAusAblage(zustand([]), ANNA);
      expect(nachAuswahl.art).toBe('auswahl');
      expect(nachAuswahl.meldung).toContain('Anna Fantasie');

      const ergebnis = aktiviereSitzplatz(zustand([], { art: 'ablage', schuelerId: ANNA }), PLATZ_A);
      expect(ergebnis).toEqual({
        art: 'speichern',
        zuordnungen: [{ sitzplatzId: PLATZ_A, schuelerId: ANNA }],
        meldung: 'Anna Fantasie sitzt jetzt auf Platz 1.',
      });
    });

    it('hebt eine erneute Auswahl desselben Schülers wieder auf', () => {
      const ergebnis = waehleAusAblage(zustand([], { art: 'ablage', schuelerId: ANNA }), ANNA);
      expect(ergebnis).toEqual({ art: 'auswahl', auswahl: null, meldung: 'Auswahl aufgehoben.' });
    });
  });

  describe('Ablage → belegter Sitzplatz wird abgelehnt statt zu verdrängen', () => {
    const belegt: Zuordnung[] = [{ sitzplatzId: PLATZ_A, schuelerId: BRUNO }];

    it('ändert die Zuordnungen nicht und begründet die Ablehnung nachvollziehbar', () => {
      const ergebnis = aktiviereSitzplatz(zustand(belegt, { art: 'ablage', schuelerId: ANNA }), PLATZ_A);

      expect(ergebnis.art).toBe('abgelehnt');
      // Kein Schreibvorgang — Bruno bleibt sitzen, Anna bleibt in der Ablage.
      expect(ergebnis).not.toHaveProperty('zuordnungen');
      // Die Ablehnung wird angesagt und nennt sowohl den Grund als auch beide Auswege.
      expect(ergebnis.meldung).toContain('Bruno Fantasie');
      expect(ergebnis.meldung).toContain('Platz 1');
      expect(ergebnis.meldung).toMatch(/zurück/i);
      expect(ergebnis.meldung).toMatch(/tausch/i);
    });

    it('lehnt denselben Fall auch beim Ziehen aus der Ablage ab', () => {
      const ergebnis = dropAufSitzplatz(zustand(belegt), dragNutzlastSchueler(ANNA), PLATZ_A);

      expect(ergebnis.art).toBe('abgelehnt');
      expect(ergebnis).not.toHaveProperty('zuordnungen');
      expect(ergebnis.meldung).toContain('Bruno Fantasie');
    });

    it('erlaubt denselben Schüler weiterhin auf einem freien Platz', () => {
      const ergebnis = aktiviereSitzplatz(zustand(belegt, { art: 'ablage', schuelerId: ANNA }), PLATZ_B);
      expect(ergebnis).toEqual({
        art: 'speichern',
        zuordnungen: [
          { sitzplatzId: PLATZ_A, schuelerId: BRUNO },
          { sitzplatzId: PLATZ_B, schuelerId: ANNA },
        ],
        meldung: 'Anna Fantasie sitzt jetzt auf Platz 2.',
      });
    });
  });

  describe('Sitzplatz → Sitzplatz', () => {
    const zwei: Zuordnung[] = [
      { sitzplatzId: PLATZ_A, schuelerId: ANNA },
      { sitzplatzId: PLATZ_B, schuelerId: BRUNO },
    ];

    it('wählt einen belegten Platz aus, wenn nichts ausgewählt ist', () => {
      const ergebnis = aktiviereSitzplatz(zustand(zwei), PLATZ_A);
      expect(ergebnis).toEqual({
        art: 'auswahl',
        auswahl: { art: 'sitzplatz', sitzplatzId: PLATZ_A },
        meldung: 'Anna Fantasie auf Platz 1 ausgewählt. Jetzt Zielplatz oder Ablage aktivieren.',
      });
    });

    it('tauscht zwei belegte Plätze und sagt den Tausch an', () => {
      const ergebnis = aktiviereSitzplatz(zustand(zwei, { art: 'sitzplatz', sitzplatzId: PLATZ_A }), PLATZ_B);
      expect(ergebnis).toEqual({
        art: 'speichern',
        zuordnungen: [
          { sitzplatzId: PLATZ_A, schuelerId: BRUNO },
          { sitzplatzId: PLATZ_B, schuelerId: ANNA },
        ],
        meldung: 'Plätze getauscht mit Platz 2.',
      });
    });

    it('verschiebt auf einen freien Platz und sagt das Verschieben an', () => {
      const ergebnis = aktiviereSitzplatz(zustand(zwei, { art: 'sitzplatz', sitzplatzId: PLATZ_A }), PLATZ_C);
      expect(ergebnis).toEqual({
        art: 'speichern',
        zuordnungen: [
          { sitzplatzId: PLATZ_B, schuelerId: BRUNO },
          { sitzplatzId: PLATZ_C, schuelerId: ANNA },
        ],
        meldung: 'Auf Platz 3 verschoben.',
      });
    });

    it('liefert beim Ziehen zwischen Plätzen dasselbe Ergebnis wie die Tastaturbedienung', () => {
      const gezogen = dropAufSitzplatz(zustand(zwei), dragNutzlastSitzplatz(PLATZ_A), PLATZ_B);
      const getippt = aktiviereSitzplatz(zustand(zwei, { art: 'sitzplatz', sitzplatzId: PLATZ_A }), PLATZ_B);
      expect(gezogen).toEqual(getippt);
    });

    it('hebt die Auswahl auf, wenn derselbe Platz erneut aktiviert wird', () => {
      const ergebnis = aktiviereSitzplatz(zustand(zwei, { art: 'sitzplatz', sitzplatzId: PLATZ_A }), PLATZ_A);
      expect(ergebnis).toEqual({ art: 'auswahl', auswahl: null, meldung: 'Auswahl aufgehoben.' });
    });
  });

  describe('Sitzplatz → Ablage', () => {
    const belegt: Zuordnung[] = [
      { sitzplatzId: PLATZ_A, schuelerId: ANNA },
      { sitzplatzId: PLATZ_B, schuelerId: BRUNO },
    ];

    it('legt den Schüler zurück und sagt es an', () => {
      expect(legeZurueck(zustand(belegt), PLATZ_A)).toEqual({
        art: 'speichern',
        zuordnungen: [{ sitzplatzId: PLATZ_B, schuelerId: BRUNO }],
        meldung: 'Anna Fantasie liegt wieder in der Ablage.',
      });
    });

    it('liefert beim Ziehen in die Ablage dasselbe Ergebnis', () => {
      expect(dropAufAblage(zustand(belegt), dragNutzlastSitzplatz(PLATZ_A))).toEqual(
        legeZurueck(zustand(belegt), PLATZ_A),
      );
    });

    it('lehnt einen bereits freien Platz ab, ohne zu speichern', () => {
      const ergebnis = legeZurueck(zustand(belegt), PLATZ_C);
      expect(ergebnis.art).toBe('abgelehnt');
      expect(ergebnis).not.toHaveProperty('zuordnungen');
    });

    it('ignoriert einen Drop aus der Ablage in die Ablage', () => {
      expect(dropAufAblage(zustand(belegt), dragNutzlastSchueler(CLARA)).art).toBe('abgelehnt');
    });
  });

  describe('freier Platz ohne Auswahl', () => {
    it('erklärt, was zuerst zu tun ist, statt still nichts zu tun', () => {
      const ergebnis = aktiviereSitzplatz(zustand([]), PLATZ_A);
      expect(ergebnis.art).toBe('abgelehnt');
      expect(ergebnis.meldung).toMatch(/Ablage/);
    });
  });

  describe('nicht mehr aktive Schülerprofile', () => {
    const veraltet: Zuordnung[] = [{ sitzplatzId: PLATZ_A, schuelerId: 'sch_geloescht' }];

    it('bleibt bedienbar und benennt das unbekannte Profil verständlich', () => {
      const ausgewaehlt = aktiviereSitzplatz(zustand(veraltet), PLATZ_A);
      expect(ausgewaehlt.art).toBe('auswahl');
      expect(ausgewaehlt.meldung).toContain('nicht mehr aktives Schülerprofil');
    });

    it('lässt den veralteten Eintrag zurücklegen', () => {
      expect(legeZurueck(zustand(veraltet), PLATZ_A)).toMatchObject({
        art: 'speichern',
        zuordnungen: [],
      });
    });
  });

  describe('Akzeptanzpfad des Issues in einer Folge', () => {
    it('setzen → zweiten setzen → tauschen → zurücklegen', () => {
      let aktuell: Zuordnung[] = [];

      const ersterSchritt = aktiviereSitzplatz(zustand(aktuell, { art: 'ablage', schuelerId: ANNA }), PLATZ_A);
      expect(ersterSchritt.art).toBe('speichern');
      aktuell = (ersterSchritt as { zuordnungen: Zuordnung[] }).zuordnungen;

      const zweiterSchritt = aktiviereSitzplatz(zustand(aktuell, { art: 'ablage', schuelerId: BRUNO }), PLATZ_B);
      expect(zweiterSchritt.art).toBe('speichern');
      aktuell = (zweiterSchritt as { zuordnungen: Zuordnung[] }).zuordnungen;

      const tauschSchritt = aktiviereSitzplatz(zustand(aktuell, { art: 'sitzplatz', sitzplatzId: PLATZ_A }), PLATZ_B);
      expect(tauschSchritt.art).toBe('speichern');
      aktuell = (tauschSchritt as { zuordnungen: Zuordnung[] }).zuordnungen;
      expect(aktuell).toEqual([
        { sitzplatzId: PLATZ_A, schuelerId: BRUNO },
        { sitzplatzId: PLATZ_B, schuelerId: ANNA },
      ]);

      const zurueckSchritt = legeZurueck(zustand(aktuell), PLATZ_B);
      expect(zurueckSchritt).toEqual({
        art: 'speichern',
        zuordnungen: [{ sitzplatzId: PLATZ_A, schuelerId: BRUNO }],
        meldung: 'Anna Fantasie liegt wieder in der Ablage.',
      });
    });
  });
});
