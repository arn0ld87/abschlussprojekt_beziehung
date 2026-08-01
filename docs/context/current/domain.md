# Domain Context

Diese Begriffe sind in Code, Schemas, Schnittstellen, Tests und Dokumentation kanonisch. Die in der letzten Spalte genannten Synonyme werden dort nicht als Fachbegriffe verwendet.

| Begriff | Bedeutung | Nicht verwenden |
|---|---|---|
| Klasse | Gruppe von Schülerprofilen | Kurs, Gruppe, Classroom |
| Schülerprofil | für den Sitzplan relevante Personendarstellung | Student-Record, User |
| Raumvorlage | Geometrie und Möblierung ohne Schülerzuordnung | Layout, Template allein |
| Sitzplatz | adressierbare Position an einem Tisch | Chair, Slot ohne Kontext |
| Sitzplan | Verbindung von Klasse, Raumvorlage und Zuordnung | Board, Canvas |
| Zuordnung | Paar aus genau einem Sitzplatz und genau einem Schülerprofil | Platzierung, Mapping |
| Ablage | abgeleitete Menge der aktiven Schülerprofile ohne Zuordnung | Pool, Warteliste |
| Canvas-Dokument | versionierter räumlicher Editorzustand | Blob, Payload |
| Revision | fortlaufende Nummer des aktuellen Serverstands | Version |
| Planversion | unveränderlicher benannter Snapshot | Revision |
| Sitzregel | harte Bedingung oder gewichteter Wunsch | Constraint ohne Präzisierung |
| Planvorschlag | noch nicht übernommene Änderung | Ergebnis, Mutation |

## Invarianten

- Ein Schülerprofil kommt in einem Sitzplan höchstens einmal vor.
- Ein Sitzplatz trägt höchstens ein Schülerprofil.
- Jede Zuordnung verweist auf einen existierenden Sitzplatz der eingefrorenen Raumgeometrie des Sitzplans.
- Nur aktive Schülerprofile der Quellklasse des Sitzplans dürfen zugeordnet werden; bereits im Dokument stehende Einträge bleiben bis zum Zurücklegen zulässig.
- Die Ablage wird nie gespeichert; sie ist die Differenz aus aktiven Schülerprofilen und Zuordnungen.
- Harte Sitzregeln werden nie verletzt.
- Das Wiederherstellen einer Planversion erzeugt eine neue Revision und verändert die Planversion nicht.
- KI-Ausgabe wird erst nach fachlicher und struktureller Validierung sowie ausdrücklicher Bestätigung angewendet.
