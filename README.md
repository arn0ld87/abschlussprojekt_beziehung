# Sitzplan

Grafische, selbst gehostete Single-User-PWA zum Erstellen, dauerhaften Speichern, Wiederherstellen und KI-gestützten Optimieren von Sitzordnungen.

> **Projektstatus: M0 — Foundation.** Der aktuelle Stand ist ein Entwicklungsprototyp für Test- und Fantasiedaten. Nicht mit echten Schuldaten verwenden.

[![Repository](https://img.shields.io/badge/GitHub-arn0ld87%2Fabschlussprojekt--beziehung-111?style=flat-square&logo=github)](https://github.com/arn0ld87/abschlussprojekt_beziehung)
[![Phase](https://img.shields.io/badge/Phase-M0%20Foundation-0E8A16?style=flat-square)](./docs/STATUS.md)

## App starten

Die lauffähige Anwendung entsteht erst nach Abschluss der M0-Slices
[#18 Next.js-Scaffold](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/18),
[#19 Anwendungs-CI](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/19) und
[#20 Docker Compose](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/20).
Bis dahin sind ausschließlich die dokumentarischen und Diffs-Gates aktiv.

### Voraussetzungen

- Bun 1.3 oder neuer
- Node.js 20 oder neuer
- Docker und Docker Compose

### Docker Compose (Empfehlung)

```bash
cp .env.example .env
docker compose up -d --build
```

| Dienst | Zugriff vom Host | Zugriff von Containern |
|---|---|---|
| Anwendung | <http://localhost:3000> | — |
| Healthcheck | <http://localhost:3000/api/health> | — |
| PostgreSQL | `localhost:5432` | Service-Name aus `docker-compose.yml` (z. B. `postgres`) |

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
| Lint | `bun run lint` | nach M0 #19 |
| Typecheck | `bun run typecheck` | nach M0 #19 |
| Vitest | `bun run test` | nach M0 #19 |
| E2E | `bun run test:e2e` | nach M0 #19 |

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
