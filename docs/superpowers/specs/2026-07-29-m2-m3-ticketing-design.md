# M2/M3 Ticketing Design

## Ziel

M2 und M3 werden in vertikale, einzeln überprüfbare GitHub-Slices zerlegt. Jeder Slice liefert einen sichtbaren Nutzerpfad, einen klaren Domänenvertrag, passende Persistenz-/UI-Grenzen und messbare Akzeptanzkriterien.

## M2 — Raumeditor

1. Raumvorlagen-Grundlage: CRUD, Ownership, Soft-Delete und versioniertes leeres Raumdokument.
2. Maßstab und Raster: Konva-Fläche mit realen Maßen, Koordinatentransformation und einstellbarem Raster.
3. Standardobjekte: Palette und persistente Objekte für Tisch, Doppeltisch, Lehrertisch, Tafel, Tür und Fenster.
4. Auswahl und Bewegung: Selektion, Drag-and-drop, Rasterfang und Begrenzung auf den Raum.
5. Objektaktionen: Rotation, Duplizieren, Löschen und Tastatur-/Toolbar-Bedienung.
6. Adressierbare Sitzplätze: stabile Sitzplatz-IDs und sichtbare Sitzpositionen an Tischtypen.
7. M2-Akzeptanz: durchgängiger Raumvorlagenpfad, Dokumentationssync und alle Gates.

## M3 — Persistente Pläne

1. Sitzplan-Grundlage: Klasse und Raum zu einem neuen Plan verbinden; Raumgeometrie wird beim Anlegen in das versionierte Plandokument kopiert.
2. Schülerzuordnung: Ablage nicht platzierter Schüler, Drag-and-drop auf Sitzplätze, Tauschen und Entfernen.
3. Undo/Redo: sitzungsbezogene Command-Historie und sichtbarer Dirty-State.
4. Serverseitiges Autosave: Debounce, erwartete Revision und konfliktfreies Speichern.
5. Lokale Entwürfe: IndexedDB, Wiederherstellungsangebot, Retry und explizite Konfliktentscheidung.
6. Planversionen: benannte unveränderliche Snapshots, Vorschau und Restore als neue Revision.
7. Papierkorb: gelöschte Klassen, Räume und Pläne auflisten und wiederherstellen.
8. M3-Akzeptanz: Platzieren, Autosave, Reload, Version, Restore und reversible Löschung als durchgängiger Pfad.

## Abhängigkeitsfolge

- M2 ist nach M0 fachlich startbar. Da der GitHub-Milestone `M2 — Raumeditor` noch nicht existiert, bleiben #49–#55 absichtlich `blocked`, bis Milestone und Zuordnungen angelegt sind.
- Nach der Milestone-Zuordnung wird #49 freigegeben; alle weiteren M2-Slices folgen seriell.
- M3 beginnt erst nach Abschluss der Parent-Issues M1 (#3) und M2 (#4).
- Innerhalb von M3 folgen die Slices seriell, weil sie denselben Plandokument-Vertrag erweitern.

## Architekturgrenzen

- React-Konva rendert ausschließlich validierten Domänenzustand; keine Konva-Nodes werden persistiert.
- Raum- und Sitzplandokumente sind versionsgebundene Zod-Verträge in JSONB.
- Änderungen am Dokumentvertrag benötigen Schemaversion und Migration.
- Autosave überschreibt bei Revisionskonflikten niemals still.
- Restore erzeugt immer eine neue Revision.
- PostgreSQL bleibt Serverwahrheit; IndexedDB enthält nur wiederherstellbare lokale Entwürfe.
- M2 enthält keine Schülerzuordnung oder dauerhaften Sitzpläne.
- M3 enthält keinen Optimierer, KI-Chat oder Export.
