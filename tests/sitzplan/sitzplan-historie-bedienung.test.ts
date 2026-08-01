import { describe, it, expect } from 'vitest';
import { SitzplanDokumentV1Schema } from '../../src/domain/sitzplan';
import type { Zuordnung } from '../../src/domain/sitzplan';
import { erzeugeHistorie, wendeAn, type Historie } from '../../src/domain/sitzplan/historie';
import { erzeugeSitzplaetze } from '../../src/domain/raum/sitzplaetze';
import type { RaumObjektV1 } from '../../src/domain/raum/objekte';
import {
  AENDERUNGS_ZUSTAND_TEXT,
  ermittlePlattform,
  ermittleTastaturBefehl,
  ermittleZuordnungsZustand,
  istTexteingabe,
  macheRueckgaengig,
  stelleWiederHer,
  type Plattform,
  type TastaturEreignis,
} from '../../app/(app)/sitzplaene/[id]/_components/historie-bedienung';
import {
  aktiviereSitzplatz,
  waehleAusAblage,
  type Auswahl,
  type InteraktionsZustand,
} from '../../app/(app)/sitzplaene/[id]/_components/zuordnung-interaktion';

// Bedienverhalten der Editor-Historie (M3 #58): Was Schaltflächen und
// Tastaturkürzel bewirken, entscheidet das framework-freie Modul. Geprüft wird
// hier genau dieses Verhalten — ohne DOM, ohne zusätzliche Testabhängigkeit.

const doppeltisch: RaumObjektV1 = {
  id: 'obj_t1',
  typ: 'table_double',
  x_cm: 100,
  y_cm: 100,
  breite_cm: 120,
  tiefe_cm: 60,
  rotation_deg: 0,
};
const einzeltisch: RaumObjektV1 = {
  id: 'obj_t2',
  typ: 'table_single',
  x_cm: 400,
  y_cm: 100,
  breite_cm: 60,
  tiefe_cm: 60,
  rotation_deg: 0,
};

const sitzplaetze = [...erzeugeSitzplaetze(doppeltisch), ...erzeugeSitzplaetze(einzeltisch)];
const [platzA, platzB, platzC] = sitzplaetze.map((s) => s.id);

const ANNA = 'sch_anna_fantasie';
const BRUNO = 'sch_bruno_fantasie';

function dokument(zuordnungen: readonly Zuordnung[]) {
  return {
    version: 1,
    quelle: { klasseId: 'kls_fantasie', raumId: 'raum_fantasie' },
    raumGeometrie: { breiteCm: 800, laengeCm: 600, rasterCm: 10, objekte: [doppeltisch, einzeltisch], sitzplaetze },
    zuordnungen,
  };
}

const taste = (teile: Partial<TastaturEreignis> = {}): TastaturEreignis => ({
  key: 'z',
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  ziel: null,
  ...teile,
});

describe('Historien-Bedienlogik (M3 #58)', () => {
  describe('Akzeptanzpfad über die tatsächlichen Bedienentscheidungen', () => {
    it('setzen → tauschen → zweimal rückgängig → zweimal wiederherstellen → neue Änderung sperrt das Wiederherstellen', () => {
      let historie = erzeugeHistorie<Zuordnung[]>([]);
      let auswahl: Auswahl = null;

      const zustand = (): InteraktionsZustand => ({
        zuordnungen: historie.gegenwart,
        auswahl,
        schuelerNamen: new Map([
          [ANNA, 'Anna Fantasie'],
          [BRUNO, 'Bruno Fantasie'],
        ]),
        platzNamen: new Map(sitzplaetze.map((s) => [s.id, s.bezeichnung ?? s.id])),
      });

      /** Bildet die Komponente nach: Auswahl merken, Änderung in die Historie. */
      const bediene = (interaktion: ReturnType<typeof aktiviereSitzplatz>) => {
        if (interaktion.art === 'speichern') {
          historie = wendeAn(historie, interaktion.zuordnungen);
          auswahl = null;
        } else if (interaktion.art === 'auswahl') {
          auswahl = interaktion.auswahl;
        }
        return interaktion;
      };

      // Anna aus der Ablage auf Platz A setzen
      bediene(waehleAusAblage(zustand(), ANNA));
      bediene(aktiviereSitzplatz(zustand(), platzA));
      expect(historie.gegenwart).toEqual([{ sitzplatzId: platzA, schuelerId: ANNA }]);

      // Bruno auf Platz B setzen, dann A und B tauschen
      bediene(waehleAusAblage(zustand(), BRUNO));
      bediene(aktiviereSitzplatz(zustand(), platzB));
      bediene(aktiviereSitzplatz(zustand(), platzA));
      bediene(aktiviereSitzplatz(zustand(), platzB));
      const nachTausch = historie.gegenwart;
      expect(nachTausch).toEqual([
        { sitzplatzId: platzA, schuelerId: BRUNO },
        { sitzplatzId: platzB, schuelerId: ANNA },
      ]);

      // zweimal rückgängig
      for (let i = 0; i < 2; i++) {
        const aktion = macheRueckgaengig(historie);
        expect(aktion.art).toBe('anwenden');
        if (aktion.art === 'anwenden') historie = aktion.historie;
      }
      expect(historie.gegenwart).toEqual([{ sitzplatzId: platzA, schuelerId: ANNA }]);

      // zweimal wiederherstellen
      for (let i = 0; i < 2; i++) {
        const aktion = stelleWiederHer(historie);
        expect(aktion.art).toBe('anwenden');
        if (aktion.art === 'anwenden') historie = aktion.historie;
      }
      expect(historie.gegenwart).toEqual(nachTausch);
      expect(stelleWiederHer(historie).art).toBe('abgelehnt');

      // einmal zurück, dann eine neue Änderung — Wiederherstellen ist weg
      const zurueck = macheRueckgaengig(historie);
      if (zurueck.art === 'anwenden') historie = zurueck.historie;
      expect(stelleWiederHer(historie).art).toBe('anwenden');

      // Neue Änderung: Anna von Platz A auf den freien Platz C verschieben.
      bediene(aktiviereSitzplatz(zustand(), platzA));
      bediene(aktiviereSitzplatz(zustand(), platzC));
      expect(historie.gegenwart).toEqual([
        { sitzplatzId: platzB, schuelerId: BRUNO },
        { sitzplatzId: platzC, schuelerId: ANNA },
      ]);
      expect(stelleWiederHer(historie).art).toBe('abgelehnt');

      // Jeder erreichte Zustand bleibt ein gültiges Plandokument.
      for (const eintrag of [...historie.vergangenheit, historie.gegenwart, ...historie.zukunft]) {
        expect(SitzplanDokumentV1Schema.safeParse(dokument(eintrag)).success).toBe(true);
      }
    });
  });

  describe('Ablehnung ohne verfügbaren Schritt', () => {
    it('lehnt Rückgängig und Wiederherstellen mit erklärender Meldung ab, statt still nichts zu tun', () => {
      const leer = erzeugeHistorie<Zuordnung[]>([]);

      const zurueck = macheRueckgaengig(leer);
      expect(zurueck.art).toBe('abgelehnt');
      expect(zurueck.meldung).toMatch(/rückgängig/i);

      const vor = stelleWiederHer(leer);
      expect(vor.art).toBe('abgelehnt');
      expect(vor.meldung).toMatch(/wiederherge/i);
    });
  });

  describe('Änderungszustand', () => {
    const historie = (): Historie<Zuordnung[]> =>
      wendeAn(erzeugeHistorie<Zuordnung[]>([]), [{ sitzplatzId: platzA, schuelerId: ANNA }]);

    it('bildet die vier sichtbaren Zustände ab', () => {
      const unveraendert = erzeugeHistorie<Zuordnung[]>([]);
      expect(ermittleZuordnungsZustand(unveraendert, { speichert: false, fehler: false })).toBe('gespeichert');
      expect(ermittleZuordnungsZustand(historie(), { speichert: false, fehler: false })).toBe('geändert');
      expect(ermittleZuordnungsZustand(historie(), { speichert: true, fehler: false })).toBe('speichert');
      expect(ermittleZuordnungsZustand(historie(), { speichert: false, fehler: true })).toBe('fehler');
    });

    it('hat für jeden Zustand eine unterscheidbare sichtbare Beschriftung', () => {
      const texte = Object.values(AENDERUNGS_ZUSTAND_TEXT);
      expect(texte).toHaveLength(4);
      expect(new Set(texte).size).toBe(4);
      for (const text of texte) expect(text.trim().length).toBeGreaterThan(0);
    });
  });

  describe('Plattformkonvention', () => {
    it('erkennt macOS und iOS an der Browserkennung, alles andere nicht', () => {
      expect(ermittlePlattform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('mac');
      expect(ermittlePlattform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('mac');
      expect(ermittlePlattform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('sonstige');
      expect(ermittlePlattform('Mozilla/5.0 (X11; Linux x86_64)')).toBe('sonstige');
    });
  });

  describe('Tastaturkürzel', () => {
    it('nutzt auf macOS die Befehlstaste und ignoriert Strg', () => {
      expect(ermittleTastaturBefehl(taste({ metaKey: true }), 'mac')).toBe('rueckgaengig');
      expect(ermittleTastaturBefehl(taste({ metaKey: true, shiftKey: true }), 'mac')).toBe('wiederherstellen');
      expect(ermittleTastaturBefehl(taste({ ctrlKey: true }), 'mac')).toBeNull();
      // Strg+Y ist keine macOS-Konvention.
      expect(ermittleTastaturBefehl(taste({ key: 'y', metaKey: true }), 'mac')).toBeNull();
    });

    it('nutzt außerhalb von macOS Strg und ignoriert die Meta-/Fenstertaste', () => {
      expect(ermittleTastaturBefehl(taste({ ctrlKey: true }), 'sonstige')).toBe('rueckgaengig');
      expect(ermittleTastaturBefehl(taste({ ctrlKey: true, shiftKey: true }), 'sonstige')).toBe('wiederherstellen');
      expect(ermittleTastaturBefehl(taste({ key: 'y', ctrlKey: true }), 'sonstige')).toBe('wiederherstellen');
      expect(ermittleTastaturBefehl(taste({ metaKey: true }), 'sonstige')).toBeNull();
    });

    it('greift nur bei gedrücktem Modifikator und nur bei den vorgesehenen Tasten', () => {
      expect(ermittleTastaturBefehl(taste(), 'mac')).toBeNull();
      expect(ermittleTastaturBefehl(taste(), 'sonstige')).toBeNull();
      expect(ermittleTastaturBefehl(taste({ key: 'a', ctrlKey: true }), 'sonstige')).toBeNull();
      // Groß geschrieben (Umschalt gedrückt) bleibt derselbe Befehl.
      expect(ermittleTastaturBefehl(taste({ key: 'Z', ctrlKey: true, shiftKey: true }), 'sonstige')).toBe(
        'wiederherstellen',
      );
    });

    const plattformen: Plattform[] = ['mac', 'sonstige'];
    const modifikator = (plattform: Plattform) =>
      plattform === 'mac' ? { metaKey: true } : { ctrlKey: true };

    it('greift nicht im Namensfeld des Plans und in keiner anderen Texteingabe', () => {
      // Das Namensfeld des Plans steht auf derselben Seite wie der Editor.
      // Dort muss das Kürzel die Texteingabe zurücknehmen, nicht die Sitzordnung.
      const namensfeld = { tagName: 'INPUT', typ: 'text', istEditierbar: false };
      const ohneTyp = { tagName: 'INPUT', typ: null, istEditierbar: false };
      const mehrzeilig = { tagName: 'TEXTAREA', istEditierbar: false };
      const reichtext = { tagName: 'DIV', istEditierbar: true };
      const suchfeld = { tagName: 'INPUT', typ: 'search', istEditierbar: false };
      const zahlenfeld = { tagName: 'INPUT', typ: 'number', istEditierbar: false };

      for (const plattform of plattformen) {
        for (const ziel of [namensfeld, ohneTyp, mehrzeilig, reichtext, suchfeld, zahlenfeld]) {
          expect(
            ermittleTastaturBefehl(taste({ ...modifikator(plattform), ziel }), plattform),
            `${plattform} — ${ziel.tagName}/${'typ' in ziel ? ziel.typ : '—'}`,
          ).toBeNull();
        }
      }
    });

    it('greift dagegen aus dem Editor heraus und aus Bedienelementen ohne Texteingabe', () => {
      const sitzplatzKnopf = { tagName: 'BUTTON', istEditierbar: false };
      const kontrollkaestchen = { tagName: 'INPUT', typ: 'checkbox', istEditierbar: false };
      const seite = { tagName: 'BODY', istEditierbar: false };

      for (const plattform of plattformen) {
        for (const ziel of [sitzplatzKnopf, kontrollkaestchen, seite, null]) {
          expect(
            ermittleTastaturBefehl(taste({ ...modifikator(plattform), ziel }), plattform),
            `${plattform} — ${ziel?.tagName ?? 'kein Ziel'}`,
          ).toBe('rueckgaengig');
        }
      }
    });

    it('erkennt Texteingaben unabhängig von der Groß-/Kleinschreibung im Markup', () => {
      expect(istTexteingabe({ tagName: 'input', typ: 'TEXT' })).toBe(true);
      expect(istTexteingabe({ tagName: 'textarea' })).toBe(true);
      expect(istTexteingabe({ tagName: 'input', typ: 'CHECKBOX' })).toBe(false);
      expect(istTexteingabe(null)).toBe(false);
    });
  });
});
