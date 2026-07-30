import { describe, it, expect } from 'vitest';
import { TASTATURKUERZEL, aktionFuerTaste, istEingabefeld } from '../../app/(app)/raeume/[id]/_components/tastatur';

describe('Tastaturkürzel für Objektaktionen (M2 #53)', () => {
  it('bildet dokumentierte Kürzel auf Aktionen ab', () => {
    expect(aktionFuerTaste('r')).toBe('rotieren');
    expect(aktionFuerTaste('R')).toBe('rotieren');
    expect(aktionFuerTaste('d')).toBe('duplizieren');
    expect(aktionFuerTaste('Delete')).toBe('loeschen');
    expect(aktionFuerTaste('Backspace')).toBe('loeschen');
    expect(aktionFuerTaste('x')).toBeNull();
    expect(aktionFuerTaste('Escape')).toBeNull();
  });

  it('dokumentiert jede Aktion genau einmal', () => {
    const aktionen = TASTATURKUERZEL.map((k) => k.aktion).sort();
    expect(aktionen).toEqual(['duplizieren', 'loeschen', 'rotieren']);
    for (const k of TASTATURKUERZEL) {
      expect(k.tasten.length).toBeGreaterThan(0);
      expect(k.beschreibung.length).toBeGreaterThan(0);
    }
  });

  it('bildet jeden dokumentierten Eintrag aus derselben Quelle ab', () => {
    // Drift-Schutz: TASTATURKUERZEL und aktionFuerTaste dürfen nicht
    // auseinanderlaufen — jeder dokumentierte Eintrag muss auflösbar sein.
    const domKey: Record<string, string> = { Entf: 'Delete' };
    for (const k of TASTATURKUERZEL) {
      expect(aktionFuerTaste(domKey[k.tasten] ?? k.tasten)).toBe(k.aktion);
    }
  });

  it('lässt Nicht-Elemente und (ohne DOM) Eingabefeld-Prüfung sicher durch', () => {
    // Node-Umgebung ohne HTMLElement: conservative Freigabe, kein Throw
    expect(istEingabefeld(null)).toBe(false);
    expect(istEingabefeld({} as EventTarget)).toBe(false);
  });
});
