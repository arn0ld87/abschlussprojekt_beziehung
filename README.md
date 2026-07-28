# Sitzplan

Grafische, selbst gehostete Single-User-PWA zum Erstellen, dauerhaften Speichern, Wiederherstellen und KI-gestützten Optimieren von Sitzordnungen.

> **Projektstatus: M0 — Foundation.** Der aktuelle Stand ist ein Entwicklungsprototyp für Test- und Fantasiedaten. Nicht mit echten Schuldaten verwenden.

[![Repository](https://img.shields.io/badge/GitHub-arn0ld87%2Fabschlussprojekt--beziehung-111?style=flat-square&logo=github)](https://github.com/arn0ld87/abschlussprojekt_beziehung)
[![Phase](https://img.shields.io/badge/Phase-M0%20Foundation-0E8A16?style=flat-square)](./docs/STATUS.md)

## App starten

Die Next.js-Scaffold läuft seit M0-Slice
[#18](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/18), die
Anwendungs-CI seit
[#19](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/19).
[#27 Foundation-Baseline](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/27)
synchronisiert die Doku, hebt Next.js auf die 16-LTS und aktiviert die
Lint-, Typecheck-, Test- und Build-Gates. Die Docker-Laufzeit und der
Healthcheck-Endpunkt entstehen mit
[#20](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/20).

### Voraussetzungen

- Bun 1.3 oder neuer
- Node.js 20.9 oder neuer

### Host-Entwicklung

```bash
bun install --frozen-lockfile
bun run dev
```

### Qualitäts-Gates

| Gate | Befehl | Status |
|---|---|---|
| Dokumentation | `bash scripts/check-docs.sh` | aktiv |
| App-Diff | `git diff --check` | aktiv |
| Lint | `bun run lint` | aktiv (M0 #27) |
| Typecheck | `bun run typecheck` | aktiv (M0 #27) |
| Vitest | `bun run test` | aktiv (M0 #27) |
| Build | `bun run build` | aktiv (M0 #27) |

### Worktrees

Pro Issue-Lauf wird ein eigener Git-Worktree unter
`<worktree-basisverzeichnis>/abschlussprojekt_beziehung.worktrees/m0-<nr>-<name>`
angelegt. Der Hauptklon bleibt unangetastet. Konvention und Workflow sind in
[`docs/runbooks/next-task.md`](docs/runbooks/next-task.md) dokumentiert.

## Produktziel

Sitzplan unterstützt eine einzelne Lehrkraft beim visuellen Planen von Klassen, Räumen und Sitzordnungen. Der erste Release bleibt ein selbst gehosteter Prototyp und verarbeitet keine echten Schuldaten.

## MVP in Kürze

Das MVP verbindet Klassen- und Raumverwaltung, einen grafischen Sitzplan-Editor, sichere Speicherung und Wiederherstellung, einen deterministischen Optimierer, KI-gestützte Änderungsvorschläge sowie Druck- und Exportfunktionen.

## Geplanter Stack

Next.js mit App Router und TypeScript, React-Konva, PostgreSQL mit Drizzle ORM, Zod, Better Auth, Vercel AI SDK, IndexedDB und Docker Compose. Die bestätigte Architektur steht in `docs/product.md`.

## Entwicklungsstatus

Der verifizierte Istzustand steht in `docs/STATUS.md`. Produktcode ist noch nicht begonnen; der aktuelle Freigabepunkt ist M0.

## Dokumentationshierarchie

`README.md` → `docs/STATUS.md` → `ROADMAP.md` → GitHub Issues

Diese Reihenfolge trennt Einstieg, überprüfbaren Istzustand, strategische Milestones und ausführbare Arbeit. Produkt- und Architekturdetails bleiben verbindlich in:

- [`docs/product.md`](docs/product.md) — bestätigte Produkt- und Architekturspezifikation (Was und Wie).
- [`docs/architecture.md`](docs/architecture.md) — Modulgrenzen, Abhängigkeitsrichtung und Verträge (Wie im Detail).

## Arbeitsweise

Ein GitHub Issue beschreibt einen vertikalen, testbaren Slice. Änderungen folgen RED → GREEN → Refactor und werden mit passenden Prüfungen sowie einem unabhängigen Review abgeschlossen.

## Projektgrenzen

Keine Mehrbenutzerfunktionen, keine Echtzeit-Zusammenarbeit und keine Freigabe für echte Schuldaten gehören zum MVP. KI darf nur validierte Änderungsvorschläge erzeugen und verändert nie direkt Datenbank oder Canvas.

## Repository

Ziel-Repository: `arn0ld87/abschlussprojekt_beziehung`.
