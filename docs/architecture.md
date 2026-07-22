# Systemarchitektur

Diese Architektur setzt die bestätigte Produktspezifikation aus `docs/product.md` um. Sie beschreibt Grenzen und Abhängigkeiten, ohne Produktfunktionen über die zehn bestätigten Module hinaus einzuführen.

## Abhängigkeitsrichtung

```text
UI / React-Konva
       ↓
Application services
       ↓
Domain contracts + pure logic
       ↑
Infrastructure adapters (PostgreSQL, files, AI providers, IndexedDB)
```

Domänenverträge und reine Fachlogik kennen weder Next.js noch React-Konva, Datenbanktreiber oder KI-SDKs. Application Services orchestrieren Anwendungsfälle über kleine Ports. Next.js Route Handler und UI-Komponenten sind Eingangsadapter; Infrastrukturadapter implementieren die Ports für PostgreSQL, Dateien, KI-Provider und IndexedDB. Die UI greift nie direkt auf Datenbank oder KI-Provider zu.

## Produktmodule

| Modul | Verantwortung |
|---|---|
| Klassenbuch | Klassen, Schülerprofile, Fotos und CSV-Import |
| Raumplaner | Maße, Raster, Möbel und Sitzplätze |
| Sitzplan-Editor | Platzierung, Auswahl, Undo/Redo und lokale Entwürfe |
| Persistenz | Autosave, Revisionen, Snapshots, Papierkorb und Restore |
| Regelwerk | Harte Regeln, gewichtete Wünsche, Konflikte und Bewertung |
| Optimierer | Reproduzierbare Sitzvorschläge ohne LLM-Abhängigkeit |
| KI-Assistent | Chat, strukturierte Kommandos, Vorschau und Erklärung |
| Export | Druckansicht, PDF und PNG |
| Provider | OpenAI-kompatible Verbindung, Ollama und Verbindungstest |
| Betrieb | Authentifizierung, Backup, Restore und Healthchecks |

Die Modulnamen bezeichnen fachliche Verantwortungsbereiche, nicht zwingend Deployments. Das MVP wird als eine Next.js-Anwendung mit App Router und ohne separates Backend ausgeliefert.

## Verträge und Zuständigkeiten

- Das Canvas-Dokument ist der gemeinsame, Zod-validierte Vertrag für Sitzplan-Editor, Persistenz, Planversion, Export und Vorschau.
- React-Konva rendert und bearbeitet interaktive 2D-Darstellungen, ist aber kein Persistenzformat.
- Relationale Daten halten Metadaten; versionierte Canvas-Dokumente liegen als JSONB vor. Vertragsänderungen benötigen Schemaversion und Migration.
- PostgreSQL ist die Serverwahrheit. IndexedDB bewahrt wiederherstellbare lokale Entwürfe; Revisionskonflikte werden ausdrücklich aufgelöst.
- Autosave erzeugt Revisionen für laufende Arbeit. Benannte Planversionen sind unveränderliche fachlich wichtige Stände; Restore erzeugt eine neue Revision.
- KI-Provider liefern ausschließlich validierbare Domänenkommandos. Ein Planvorschlag wird erst nach Prüfung und Bestätigung übernommen.
- Der deterministische Optimierer verantwortet die Gültigkeit einer Platzierung, wahrt harte Sitzregeln und reproduziert Ergebnisse bei gleichen Eingaben und gleichem Seed.

## Laufzeit und Evolution

Manuelle Planung und der Optimierer bleiben ohne erreichbaren KI-Provider nutzbar. Der Provideradapter unterstützt OpenAI-kompatibles BYOK und Ollama und bleibt austauschbar. Der MVP ist ein Single-User-Prototyp für Test- und Fantasiedaten; Mehrbenutzerbetrieb und Produktivfreigabe sind spätere Milestones.

Granulare Persistenz und vollständige Ereignishistorie sind zurückgestellt. Vor Arbeiten an M9 oder M10 muss ein neues akzeptiertes ADR belegen, dass Canvas-Dokumente und Planversionen für den nachgewiesenen Bedarf nicht ausreichen.

## Verbindliche Entscheidungen

Der Index unter `docs/decisions/README.md` führt die zehn akzeptierten Architekturentscheidungen. Spätere Änderungen ersetzen eine Entscheidung nur durch ein neues ADR; akzeptierte Historie wird nicht stillschweigend umgeschrieben.
