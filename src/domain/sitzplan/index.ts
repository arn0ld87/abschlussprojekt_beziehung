export * from './sitzplan';
export * from './sitzplan-repository-port';
export * from './sitzplan-service';
export * from './zuordnung-commands';
// `./historie` ist bewusst nicht Teil dieses Barrels: Das Modul ist generisch
// (`Historie<T>`) und trägt sehr allgemeine Namen (`undo`, `redo`, `wendeAn`,
// `bestaetige`, `setzeZurueck`), die im Sitzplan-Namensraum neben
// `setzeSchueler`/`setzeZuordnungen` kollidieren könnten. Aufrufer importieren
// gezielt aus `src/domain/sitzplan/historie`.
