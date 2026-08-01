import { AENDERUNGS_ZUSTAND_TEXT } from './historie-bedienung';
import type { AenderungsZustand } from '../../../../../src/domain/sitzplan/historie';

export interface HistorieLeisteProps {
  zustand: AenderungsZustand;
  kannZurueck: boolean;
  kannVor: boolean;
  /** Während eines Schreibvorgangs bleibt jede Bedienhandlung folgenlos. */
  speichert: boolean;
  kuerzel: { rueckgaengig: string; wiederherstellen: string };
  onZurueck: () => void;
  onVor: () => void;
}

const knopf: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid #7c2d12',
  background: '#ffffff',
  color: '#7c2d12',
  fontSize: '0.875rem',
};

/**
 * Bedienelemente der Editor-Historie und sichtbarer Änderungszustand (M3 #58).
 *
 * Eigene, zustandslose Darstellungskomponente, damit alle vier
 * Änderungszustände tatsächlich gerendert und geprüft werden können — die
 * Zustände `geändert`, `speichert` und `fehler` entstehen sonst erst durch
 * Interaktion und wären in einem statischen Rendering unerreichbar.
 *
 * Bewusst `role="group"` statt `role="toolbar"`: Eine Toolbar verpflichtet zur
 * Pfeiltastennavigation mit einem einzigen Tabstopp; hier sind beide
 * Schaltflächen einzeln erreichbar. Der Änderungszustand steht daneben als
 * sichtbarer Text und ist bewusst keine zweite Live-Region — angesagt wird über
 * die Statuszeile der Zuordnung, damit eine Änderung nicht doppelt vorgelesen
 * wird.
 *
 * `aria-disabled` statt `disabled`: Der Fokus darf beim Speichern nicht auf
 * `<body>` zurückfallen (WCAG 2.4.3); der Schutz vor Doppelaktionen liegt in
 * der aufrufenden Bedienlogik.
 */
export default function HistorieLeiste({
  zustand,
  kannZurueck,
  kannVor,
  speichert,
  kuerzel,
  onZurueck,
  onVor,
}: HistorieLeisteProps) {
  return (
    <div
      role="group"
      aria-label="Änderungshistorie"
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', flexWrap: 'wrap' }}
    >
      <button
        type="button"
        className="sitzplan-ziel"
        aria-disabled={speichert || !kannZurueck}
        aria-keyshortcuts={kuerzel.rueckgaengig}
        onClick={onZurueck}
        style={knopf}
      >
        Rückgängig
      </button>
      <button
        type="button"
        className="sitzplan-ziel"
        aria-disabled={speichert || !kannVor}
        aria-keyshortcuts={kuerzel.wiederherstellen}
        onClick={onVor}
        style={knopf}
      >
        Wiederherstellen
      </button>
      <span style={{ color: '#4b5563', fontSize: '0.875rem' }}>
        Änderungszustand: <strong>{AENDERUNGS_ZUSTAND_TEXT[zustand]}</strong>
      </span>
    </div>
  );
}
