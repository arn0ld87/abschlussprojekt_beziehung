# Konfiguration

**Stand:** 29.07.2026
**Status:** M0-Baseline. Erweiterungen (Auth, KI-Provider/BYOK, Backup) folgen mit den jeweiligen Milestones und werden dann hier dokumentiert.

## Grundregeln

- Konfiguration läuft über Umgebungsvariablen. Vorlage: [`.env.example`](../.env.example) — kopieren nach `.env` und befüllen.
- **Niemals** Secrets, Provider-Keys oder echte Zugangsdaten committen. `.env` ist nicht Teil des Repositories.
- Versionsstände (Node, Bun, Next.js) stehen in [`package.json`](../package.json) (`engines`, `packageManager`) und im [`Dockerfile`](../Dockerfile). Diese Datei beschreibt das *Wie*, nicht den jeweiligen Ist-Stand — bei Abweichungen gilt das Repository.

## Umgebungsvariablen

| Variable | Zweck | Default (Compose) |
|---|---|---|
| `DATABASE_URL` | Verbindungs-URL der Anwendung zu PostgreSQL | aus den drei `POSTGRES_*`-Werten zusammengesetzt |
| `POSTGRES_USER` | Datenbankbenutzer | `postgres` |
| `POSTGRES_PASSWORD` | Datenbankpasswort | `changeme` — **lokal ok, niemals produktiv** |
| `POSTGRES_DB` | Datenbankname | `sitzplan` |
| `PORT` | HTTP-Port der Anwendung (Host-Seite) | `3000` |

## Laufzeit-Baseline

- Paketmanager ist Bun (Version via `packageManager` in [`package.json`](../package.json)); `bun install --frozen-lockfile` hält das Lockfile reproduzierbar.
- Die Node-Baseline steht in `engines.node` und muss mit Dockerfile-Basisimage und CI-Runner übereinstimmen.
- Dependency-Updates laufen über den in `.github/` konfigurierten Update-Mechanismus (Dependabot/Renovate); Update-PRs durchlaufen dieselben Gates wie jeder andere PR.

## Qualitäts-Gates (lokal wie CI)

```bash
bun run lint        # ESLint, --max-warnings=0
bun run typecheck   # next typegen + tsc --noEmit
bun run test        # Vitest
bun run build       # Produktiv-Build
bash scripts/check-docs.sh   # Dokumentationsgate
git diff --check             # Basisprüfung
```

## Docker Compose

- `docker compose up -d --build` startet Anwendung und PostgreSQL; die App wartet auf einen healthy PostgreSQL (`pg_isready` + `SELECT 1`).
- Der App-Healthcheck ruft `GET /api/health` auf, der seinerseits ein echtes `SELECT 1` mit Verbindungs-, Query- und Statement-Timeout ausführt.
- Daten bleiben im Volume `sitzplan_pgdata` erhalten; `docker compose down -v` löscht sie unwiderruflich.
- Backup/Restore-Verfahren: [`docs/runbooks/backup-restore.md`](runbooks/backup-restore.md).

## KI-Provider (ab M5)

Der KI-Assistent nutzt einen OpenAI-kompatiblen BYOK-Endpunkt oder lokalen Ollama. Keys und Endpunkte werden ausschließlich über Umgebungsvariablen konfiguriert, nie im Code oder in committeten Dateien. Die konkreten Variablen werden mit M5 hier ergänzt.
