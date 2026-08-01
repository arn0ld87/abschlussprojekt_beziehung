import { describe, it, expect } from 'vitest';
import { SitzplanDokumentV1Schema } from '../../src/domain/sitzplan';
import type { Zuordnung } from '../../src/domain/sitzplan';
import {
  HISTORIE_GRENZE,
  bestaetige,
  ermittleAenderungsZustand,
  erzeugeHistorie,
  kannRedo,
  kannUndo,
  redo,
  setzeZurueck,
  undo,
  wendeAn,
  type Historie,
} from '../../src/domain/sitzplan/historie';
import {
  entferne,
  gleicheZuordnungen,
  setzeSchueler,
  tausche,
} from '../../src/domain/sitzplan/zuordnung-commands';
import { erzeugeSitzplaetze } from '../../src/domain/raum/sitzplaetze';
import type { RaumObjektV1 } from '../../src/domain/raum/objekte';

// Verhalten der framework-freien Editor-Historie (M3 #58). Geprüft wird, was
// die Historie tut — nicht, wie sie geschrieben ist. Jeder erreichbare Zustand
// muss ein gegen `SitzplanDokumentV1` gültiges Dokument ergeben, inklusive der
// vier harten Invarianten aus M3 #57.

/** Deterministischer PRNG (mulberry32) — reproduzierbare Command-Folgen. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tische: RaumObjektV1[] = [
  { id: 'obj_a', typ: 'table_double', x_cm: 50, y_cm: 50, breite_cm: 120, tiefe_cm: 60, rotation_deg: 0 },
  { id: 'obj_b', typ: 'table_double', x_cm: 300, y_cm: 50, breite_cm: 120, tiefe_cm: 60, rotation_deg: 0 },
  { id: 'obj_c', typ: 'table_single', x_cm: 50, y_cm: 300, breite_cm: 60, tiefe_cm: 60, rotation_deg: 0 },
];

const sitzplaetze = tische.flatMap((t) => erzeugeSitzplaetze(t));
const sitzplatzIds = sitzplaetze.map((s) => s.id);
const schuelerIds = Array.from({ length: 8 }, (_, i) => `sch_fantasie_${i + 1}`);

function dokument(zuordnungen: readonly Zuordnung[]) {
  return {
    version: 1,
    quelle: { klasseId: 'kls_fantasie', raumId: 'raum_fantasie' },
    raumGeometrie: { breiteCm: 800, laengeCm: 600, rasterCm: 10, objekte: tische, sitzplaetze },
    zuordnungen,
  };
}

/** Jeder erreichbare Historienzustand ergibt ein gültiges Plandokument. */
function pruefeDokumentvertrag(historie: Historie<Zuordnung[]>, kontext: string) {
  for (const [name, zustand] of [
    ['gegenwart', historie.gegenwart] as const,
    ['bestaetigt', historie.bestaetigt] as const,
    ...historie.vergangenheit.map((z, i) => [`vergangenheit[${i}]`, z] as const),
    ...historie.zukunft.map((z, i) => [`zukunft[${i}]`, z] as const),
  ]) {
    const ergebnis = SitzplanDokumentV1Schema.safeParse(dokument(zustand));
    expect(ergebnis.success, `${kontext} — ${name}`).toBe(true);
  }
}

describe('Editor-Historie (M3 #58)', () => {
  describe('Akzeptanzpfad', () => {
    const platzA = sitzplatzIds[0];
    const platzB = sitzplatzIds[1];

    it('setzen → tauschen → zweimal undo → zweimal redo → neue Änderung verwirft den Redo-Zweig', () => {
      const leer: Zuordnung[] = [];
      let historie = erzeugeHistorie<Zuordnung[]>(leer);
      expect(kannUndo(historie)).toBe(false);
      expect(kannRedo(historie)).toBe(false);

      // 1. Schüler setzen
      const nachSetzen = setzeSchueler(leer, { schuelerId: schuelerIds[0], sitzplatzId: platzA });
      historie = wendeAn(historie, nachSetzen);
      expect(historie.gegenwart).toEqual([{ sitzplatzId: platzA, schuelerId: schuelerIds[0] }]);

      // 2. zweiten Schüler setzen und mit dem ersten tauschen
      const nachZweitem = setzeSchueler(historie.gegenwart, {
        schuelerId: schuelerIds[1],
        sitzplatzId: platzB,
      });
      historie = wendeAn(historie, nachZweitem);
      historie = wendeAn(historie, tausche(historie.gegenwart, platzA, platzB));
      const nachTausch = historie.gegenwart;
      expect(nachTausch).toEqual([
        { sitzplatzId: platzA, schuelerId: schuelerIds[1] },
        { sitzplatzId: platzB, schuelerId: schuelerIds[0] },
      ]);

      // 3. zweimal rückgängig
      historie = undo(undo(historie));
      expect(historie.gegenwart).toEqual(nachSetzen);
      expect(kannRedo(historie)).toBe(true);

      // 4. zweimal wiederherstellen
      historie = redo(redo(historie));
      expect(historie.gegenwart).toEqual(nachTausch);
      expect(kannRedo(historie)).toBe(false);

      // 5. erneut zurück, dann eine neue Änderung — der Redo-Zweig ist weg
      historie = undo(historie);
      expect(kannRedo(historie)).toBe(true);
      historie = wendeAn(historie, entferne(historie.gegenwart, schuelerIds[0]));
      expect(kannRedo(historie)).toBe(false);
      expect(historie.zukunft).toEqual([]);

      pruefeDokumentvertrag(historie, 'Akzeptanzpfad');
    });
  });

  describe('Undo und Redo sind zueinander invers', () => {
    it('macht jede einzelne Änderung exakt rückgängig und stellt sie exakt wieder her', () => {
      for (const seed of [3, 21, 404, 2026]) {
        const zufall = prng(seed);
        const waehle = <T,>(werte: readonly T[]): T => werte[Math.floor(zufall() * werte.length)];

        let historie = erzeugeHistorie<Zuordnung[]>([]);

        for (let schritt = 0; schritt < 120; schritt++) {
          const kontext = `seed ${seed}, Schritt ${schritt}`;
          const vorher = historie;
          const kommando = Math.floor(zufall() * 3);

          const neu =
            kommando === 0
              ? setzeSchueler(historie.gegenwart, {
                  schuelerId: waehle(schuelerIds),
                  sitzplatzId: waehle(sitzplatzIds),
                })
              : kommando === 1
                ? tausche(historie.gegenwart, waehle(sitzplatzIds), waehle(sitzplatzIds))
                : entferne(historie.gegenwart, waehle(schuelerIds));

          historie = wendeAn(historie, neu);

          // Undo führt exakt auf die Gegenwart vor der Änderung zurück …
          const zurueck = undo(historie);
          expect(zurueck.gegenwart, `${kontext} — undo`).toEqual(vorher.gegenwart);
          // … und Redo exakt auf den Zustand danach.
          const vor = redo(zurueck);
          expect(vor.gegenwart, `${kontext} — redo`).toEqual(historie.gegenwart);
          expect(vor.vergangenheit, `${kontext} — Stapel nach redo`).toEqual(historie.vergangenheit);
          expect(vor.zukunft, `${kontext} — Zukunft nach redo`).toEqual(historie.zukunft);

          pruefeDokumentvertrag(historie, kontext);
        }
      }
    });

    it('bleibt über lange Folgen aus Ändern, Zurück und Vor hinweg gültig', () => {
      const zufall = prng(777);
      const waehle = <T,>(werte: readonly T[]): T => werte[Math.floor(zufall() * werte.length)];

      let historie = erzeugeHistorie<Zuordnung[]>([]);

      for (let schritt = 0; schritt < 500; schritt++) {
        const kontext = `Schritt ${schritt}`;
        const wuerfel = zufall();

        if (wuerfel < 0.55) {
          historie = wendeAn(
            historie,
            setzeSchueler(historie.gegenwart, {
              schuelerId: waehle(schuelerIds),
              sitzplatzId: waehle(sitzplatzIds),
            }),
          );
        } else if (wuerfel < 0.7) {
          historie = wendeAn(historie, tausche(historie.gegenwart, waehle(sitzplatzIds), waehle(sitzplatzIds)));
        } else if (wuerfel < 0.8) {
          historie = wendeAn(historie, entferne(historie.gegenwart, waehle(schuelerIds)));
        } else if (wuerfel < 0.92) {
          historie = undo(historie);
        } else {
          historie = redo(historie);
        }

        // Die Gegenwart existiert immer, und beide Stapel bleiben begrenzt.
        expect(Array.isArray(historie.gegenwart), kontext).toBe(true);
        expect(historie.vergangenheit.length, kontext).toBeLessThanOrEqual(historie.grenze);
        expect(historie.zukunft.length, kontext).toBeLessThanOrEqual(historie.grenze);
        pruefeDokumentvertrag(historie, kontext);
      }
    });
  });

  describe('Verwerfen des Redo-Zweigs', () => {
    it('verwirft nach einer neuen Änderung jeden noch offenen Wiederherstellungsschritt', () => {
      let historie = erzeugeHistorie<Zuordnung[]>([]);
      for (let i = 0; i < 5; i++) {
        historie = wendeAn(
          historie,
          setzeSchueler(historie.gegenwart, { schuelerId: schuelerIds[i], sitzplatzId: sitzplatzIds[i] }),
        );
      }

      historie = undo(undo(undo(historie)));
      expect(historie.zukunft.length).toBe(3);

      historie = wendeAn(historie, entferne(historie.gegenwart, schuelerIds[0]));
      expect(historie.zukunft).toEqual([]);
      expect(kannRedo(historie)).toBe(false);
    });
  });

  describe('Begrenzung', () => {
    it('hält höchstens `grenze` Schritte vor und verliert dabei nie die Gegenwart', () => {
      const grenze = 4;
      let historie = erzeugeHistorie<Zuordnung[]>([], grenze);
      const staende: Zuordnung[][] = [historie.gegenwart];

      for (let i = 0; i < 20; i++) {
        historie = wendeAn(historie, [
          { sitzplatzId: sitzplatzIds[0], schuelerId: `sch_fantasie_lauf_${i}` },
        ]);
        staende.push(historie.gegenwart);
        expect(historie.vergangenheit.length).toBeLessThanOrEqual(grenze);
      }

      // Die Gegenwart ist der zuletzt angewendete Zustand …
      expect(historie.gegenwart).toEqual(staende[staende.length - 1]);
      // … und die Vergangenheit enthält genau die jüngsten `grenze` Schritte,
      // die ältesten sind weggefallen.
      expect(historie.vergangenheit.length).toBe(grenze);
      expect(historie.vergangenheit).toEqual(staende.slice(staende.length - 1 - grenze, staende.length - 1));

      // Genau `grenze` Undo-Schritte sind möglich, danach ist Schluss — ohne
      // dass ein Zustand verloren geht.
      for (let i = 0; i < grenze; i++) {
        expect(kannUndo(historie)).toBe(true);
        historie = undo(historie);
      }
      expect(kannUndo(historie)).toBe(false);
      expect(undo(historie)).toBe(historie);
      expect(historie.gegenwart).toEqual(staende[staende.length - 1 - grenze]);
    });

    it('nutzt eine bewusst gewählte Vorgabegrenze und lehnt unsinnige Grenzen ab', () => {
      expect(erzeugeHistorie<Zuordnung[]>([]).grenze).toBe(HISTORIE_GRENZE);
      expect(HISTORIE_GRENZE).toBeGreaterThanOrEqual(sitzplatzIds.length);
      expect(() => erzeugeHistorie<Zuordnung[]>([], 0)).toThrow(RangeError);
      expect(() => erzeugeHistorie<Zuordnung[]>([], 1.5)).toThrow(RangeError);
    });
  });

  describe('Zurücksetzen beim Laden', () => {
    it('verwirft beide Stapel und übernimmt den geladenen Stand als Vergleichsbasis', () => {
      let historie = erzeugeHistorie<Zuordnung[]>([], 7);
      historie = wendeAn(historie, [{ sitzplatzId: sitzplatzIds[0], schuelerId: schuelerIds[0] }]);
      historie = wendeAn(historie, [{ sitzplatzId: sitzplatzIds[1], schuelerId: schuelerIds[1] }]);
      historie = undo(historie);
      expect(kannUndo(historie)).toBe(true);
      expect(kannRedo(historie)).toBe(true);

      const geladen: Zuordnung[] = [{ sitzplatzId: sitzplatzIds[2], schuelerId: schuelerIds[2] }];
      const frisch = setzeZurueck(historie, geladen);

      expect(frisch.vergangenheit).toEqual([]);
      expect(frisch.zukunft).toEqual([]);
      expect(frisch.gegenwart).toEqual(geladen);
      expect(frisch.bestaetigt).toEqual(geladen);
      // Die gewählte Grenze bleibt erhalten.
      expect(frisch.grenze).toBe(7);
    });
  });

  describe('Änderungszustand', () => {
    const lage = (speichert = false, fehler = false) => ({ speichert, fehler });
    const zustand = (historie: Historie<Zuordnung[]>, l: { speichert: boolean; fehler: boolean }) =>
      ermittleAenderungsZustand(historie, l, gleicheZuordnungen);

    it('vergleicht gegen den zuletzt bestätigten Serverstand, nicht gegen den Anfang der Historie', () => {
      const start: Zuordnung[] = [];
      let historie = erzeugeHistorie<Zuordnung[]>(start);
      expect(zustand(historie, lage())).toBe('gespeichert');

      const geaendert = setzeSchueler(start, { schuelerId: schuelerIds[0], sitzplatzId: sitzplatzIds[0] });
      historie = wendeAn(historie, geaendert);
      expect(zustand(historie, lage())).toBe('geändert');

      // Erst die Serverbestätigung macht daraus „gespeichert" …
      historie = bestaetige(historie, geaendert);
      expect(zustand(historie, lage())).toBe('gespeichert');

      // … und ein Undo zurück auf den Anfang der Historie ist danach eine
      // Abweichung vom Server, kein „gespeichert".
      historie = undo(historie);
      expect(historie.gegenwart).toEqual(start);
      expect(zustand(historie, lage())).toBe('geändert');
    });

    it('meldet „geändert", wenn der Server ein anderes Dokument bestätigt als gesendet', () => {
      let historie = erzeugeHistorie<Zuordnung[]>([]);
      historie = wendeAn(historie, [{ sitzplatzId: sitzplatzIds[0], schuelerId: schuelerIds[0] }]);
      historie = bestaetige(historie, [{ sitzplatzId: sitzplatzIds[1], schuelerId: schuelerIds[0] }]);
      expect(zustand(historie, lage())).toBe('geändert');
    });

    it('behält beide Stapel über eine Bestätigung hinweg, damit Undo nach dem Speichern bleibt', () => {
      let historie = erzeugeHistorie<Zuordnung[]>([]);
      historie = wendeAn(historie, [{ sitzplatzId: sitzplatzIds[0], schuelerId: schuelerIds[0] }]);
      historie = bestaetige(historie, historie.gegenwart);

      expect(kannUndo(historie)).toBe(true);
      expect(undo(historie).gegenwart).toEqual([]);
    });

    it('stellt Transportaussagen vor den reinen Zustandsvergleich', () => {
      const historie = erzeugeHistorie<Zuordnung[]>([]);
      expect(zustand(historie, lage(true, false))).toBe('speichert');
      expect(zustand(historie, lage(false, true))).toBe('fehler');
    });
  });

  describe('Unveränderlichkeit', () => {
    it('verändert weder Eingabewert noch Stapel einer bestehenden Historie', () => {
      const start = erzeugeHistorie<Zuordnung[]>([]);
      const neu: Zuordnung[] = [{ sitzplatzId: sitzplatzIds[0], schuelerId: schuelerIds[0] }];

      const nachAendern = wendeAn(start, neu);
      expect(start.gegenwart).toEqual([]);
      expect(start.vergangenheit).toEqual([]);

      undo(nachAendern);
      redo(nachAendern);
      bestaetige(nachAendern, neu);
      expect(nachAendern.gegenwart).toEqual(neu);
      expect(nachAendern.vergangenheit).toEqual([[]]);
      expect(nachAendern.bestaetigt).toEqual([]);
    });

    it('enthält ausschließlich Dokumentzustände und kein Ereignisprotokoll', () => {
      let historie = erzeugeHistorie<Zuordnung[]>([]);
      historie = wendeAn(historie, setzeSchueler([], { schuelerId: schuelerIds[0], sitzplatzId: sitzplatzIds[0] }));
      historie = wendeAn(historie, tausche(historie.gegenwart, sitzplatzIds[0], sitzplatzIds[1]));
      historie = undo(historie);

      // Jeder Eintrag ist eine vollständige, für sich gültige Zuordnungsliste.
      // Ein Ereignisprotokoll hätte stattdessen Befehlsnamen oder Deltas —
      // eine solche Historie wäre ohne Ausgangszustand nicht auswertbar.
      const alle = [...historie.vergangenheit, historie.gegenwart, ...historie.zukunft, historie.bestaetigt];
      for (const eintrag of alle) {
        expect(Array.isArray(eintrag)).toBe(true);
        for (const z of eintrag) {
          expect(Object.keys(z).sort()).toEqual(['schuelerId', 'sitzplatzId']);
        }
        expect(SitzplanDokumentV1Schema.safeParse(dokument(eintrag)).success).toBe(true);
      }

      // Der ganze Wert ist reiner, serialisierbarer Clientzustand ohne
      // Funktionen, DOM- oder Konva-Verweise.
      expect(() => JSON.parse(JSON.stringify(historie))).not.toThrow();
    });
  });
});
