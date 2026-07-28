# API-Übersicht

**Stand:** 29.07.2026
**Status:** Navigations- und Übersichtsdokument. Verbindliche Fachlichkeit: [`docs/product.md`](product.md) und [`docs/architecture.md`](architecture.md); kanonische Begriffe: [`CONTEXT.md`](../CONTEXT.md).

## Architektur-Regel

Next.js Route Handler sind dünne Adapter: Sie nehmen HTTP entgegen, delegieren an framework-unabhängige Services unter `src/services/` und geben die Antwort zurück. Domänenlogik lebt in `src/domain/`, Infrastruktur in `src/infrastructure/`. UI-Komponenten greifen nie direkt auf Datenbank oder KI-Provider zu. Es gibt keine separate Backend-Anwendung.

## Vorhandene Endpunkte (M0)

| Endpunkt | Zweck | Antwort |
|---|---|---|
| `GET /api/health` | Liveness + Datenbank-Probe (`SELECT 1` mit Timeouts) | `200` mit Status-Body bei Erfolg, Fehlerstatus bei DB-Ausfall |

Weitere Endpunkte entstehen mit den Milestones M1 (Auth, Klassen), M3 (Persistenz), M5 (KI-Assistent). Diese Tabelle wird pro Milestone ergänzt, nicht vorab spekuliert.

## Geplante Fachmodule und ihre Schnittstellen

Die Modulgrenzen sind in [`docs/product.md`](product.md) Abschnitt 7.2 festgelegt. Jede Modul-Schnittstelle ist ein Zod-validierter Vertrag in `src/domain/`:

| Modul | Verantwortung | Milestone |
|---|---|---|
| Klassenbuch | Klassen, Schülerprofile, Fotos, CSV-Import | M1 |
| Raumplaner | Maße, Raster, Möbel, Sitzplätze | M2 |
| Sitzplan-Editor | Platzierung, Auswahl, Undo/Redo, lokale Entwürfe | M2–M3 |
| Persistenz | Autosave, Revisionen, Snapshots, Papierkorb, Restore | M3 |
| Regelwerk | Harte Regeln, gewichtete Wünsche, Konflikte, Bewertung | M4 |
| Optimierer | Reproduzierbare Sitzvorschläge ohne LLM-Abhängigkeit | M4 |
| KI-Assistent | Chat, validierte Kommandos, Diff-Vorschau, BYOK | M5 |
| Export | Druck, PDF, PNG, Import/Export | M6 |
| Provider | OpenAI-kompatible Endpunkte, Ollama | M5 |
| Betrieb | Docker, Healthcheck, Backup/Restore | M0/M7 |

## KI-Schnittstellen-Grundsatz

Ein Sprachmodell mutiert niemals direkt Datenbank, Services oder Canvas. Es liefert ausschließlich Zod-validierte Kommandovorschläge, die gegen Entitäten geprüft und als Diff-Vorschau präsentiert werden. Erst nach ausdrücklicher Bestätigung wird angewendet (Details: [`docs/product.md`](product.md), [`CONTEXT.md`](../CONTEXT.md) Invarianten).

## Persistenz-Grundsatz

Persistiert werden versionierte, Zod-validierte Domänendokumente — keine Konva-Serialisierung. Restore erzeugt eine neue Revision; Planversionen bleiben unveränderlich. Vertragsdetails folgen mit M3 und werden dann hier verlinkt.

## Weiterführende Dokumente

- [`docs/product.md`](product.md) — verbindliche Produkt- und Architekturspezifikation
- [`docs/architecture.md`](architecture.md) — Architekturreferenz
- [`CONTEXT.md`](../CONTEXT.md) — kanonische Domänenbegriffe und Invarianten
- [`docs/configuration.md`](configuration.md) — Laufzeit- und Umgebungskonfiguration
- [`docs/troubleshooting.md`](troubleshooting.md) — Diagnose und bekannte Fallen
