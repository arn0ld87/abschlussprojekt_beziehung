# Changelog

Alle relevanten Änderungen an Sitzplan werden in dieser Datei dokumentiert.

## Unreleased

### Added

- Docker Compose-Definition für die Next.js-Anwendung und PostgreSQL (M0 #20)
- Multi-Stage-Dockerfile mit Bun-Lockfile-Modus und Standalone-Build (M0 #20)
- Infrastruktur-Healthcheck-Route `/api/health` mit echtem `SELECT 1` gegen PostgreSQL (M0 #20)
- `.env.example` mit allen erforderlichen Compose-Variablen ohne Werte (M0 #20)
- `.dockerignore` und Compose-Artefakt-Ignores in `.gitignore` (M0 #20)
- `pg` als vierte Runtime-Dependency für den Postgres-Healthcheck (M0 #20)
- app-Healthcheck im Compose-File über Bun-natives `fetch` statt `curl` (M0 #20, oven/bun-Image enthält kein curl)
- Compose-Substitutions-Defaults für `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` und `PORT` (M0 #20)

### Known limitations

- Das Container-Image für M0 #20 kopiert nur den Next.js-Standalone-Server und `public/`; `.next/static` wird nicht mitgegeben. Der Healthcheck-Endpunkt `/api/health` ist rein dynamisch und benötigt keine statischen Assets. Statische Seiten und Client-Chunks stehen im Container therefore erst ab M1+ zur Verfügung, wenn der Health-Only-Scope zugunsten echter UI-Routen erweitert wird.

### Changed

- `next.config.mjs` aktiviert den Standalone-Build für das Container-Image (M0 #20)
- M0-#27-Vertrag um `pg` als Runtime-Dependency weiterentwickelt (M0 #20)
- bestätigte Produkt- und Architektur-Spezifikation
- Projekt-Bootstrap-Plan
- kanonisches Domänenvokabular und fachliche Invarianten
- Systemarchitektur und zehn akzeptierte Architecture Decision Records
- Matt-Pocock-Projektkonfiguration für Issues, Triage und Domänendokumentation
- gemeinsame Agenten-, Beitrags- und Sicherheitsregeln
- Ziel-Runbooks für Release sowie Backup und Restore
- sieben eng abgegrenzte MiniMax-M3-Entwicklungsagenten für Lead, Frontend, Domain, KI, Tests, Dokumentation und Review
- deterministischen Ein-Issue-Workflow als Slash-Command und Runbook
- kopierfertigen MiniMax-M3-Master-Prompt für den milestoneweisen Entwicklungsstart
- GitHub-Issue-Formulare für Features und Bugs, PR-Evidenzvorlage sowie Docs-CI-Gate
- dreizehn verifizierte Milestone-Parent-Issues als ausführbarer Issue-Frontier

### Changed

- Bootstrap-Gate prüft die vollständige MiniMax-Agenten- und Ein-Issue-Workflow-Konfiguration
