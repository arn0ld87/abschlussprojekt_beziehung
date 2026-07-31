// Dokumentierte Tastaturkürzel für Objektaktionen (M2 #53) — als reine
// Funktion ausgelagert, damit die Zuordnung ohne Browser testbar bleibt.

export type ObjektAktion = 'rotieren' | 'duplizieren' | 'loeschen';

export const TASTATURKUERZEL: Array<{ tasten: string; aktion: ObjektAktion; beschreibung: string }> = [
  { tasten: 'R', aktion: 'rotieren', beschreibung: 'Objekt um 90° drehen' },
  { tasten: 'D', aktion: 'duplizieren', beschreibung: 'Objekt duplizieren' },
  { tasten: 'Entf', aktion: 'loeschen', beschreibung: 'Objekt löschen' },
];

// Einzige Zuordnungsquelle ist TASTATURKUERZEL: Anzeigenamen werden auf
// DOM-KeyboardEvent.key-Werte normalisiert ('Entf' → 'delete'), 'backspace'
// ist ein Alias für dieselbe dokumentierte Aktion.
const DOM_KEY_ALIAS: Record<string, string> = { entf: 'delete' };

const LOOKUP = new Map<string, ObjektAktion>();
for (const k of TASTATURKUERZEL) {
  LOOKUP.set(DOM_KEY_ALIAS[k.tasten.toLowerCase()] ?? k.tasten.toLowerCase(), k.aktion);
}
const loeschenAktion = TASTATURKUERZEL.find((k) => k.aktion === 'loeschen')?.aktion;
if (loeschenAktion) {
  LOOKUP.set('backspace', loeschenAktion);
}

/** Übersetzt eine Taste (KeyboardEvent.key) in eine Objektaktion (null = keine Zuordnung). */
export function aktionFuerTaste(key: string): ObjektAktion | null {
  return LOOKUP.get(key.toLowerCase()) ?? null;
}

/** true, wenn das Event aus einem Eingabefeld stammt und keine Kürzel auslösen darf. */
export function istEingabefeld(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
