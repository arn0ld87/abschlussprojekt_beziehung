# Troubleshooting

**Stand:** 29.07.2026
**Status:** Lebt von echten Befunden. Jeder Eintrag nennt Symptom, Ursache und Ausweg. Neue Fallen werden ergänzt, gelöste dauerhaft behobene entfernt.

## Setup und Build

**`bun install` schlägt fehl oder zieht unerwartete Versionen.**
Ursache: veraltetes oder händisch editiertes Lockfile. Ausweg: `bun install --frozen-lockfile` — schlägt der Befehl fehl, ist das Lockfile der Fehler, nicht die Umgehung mit `--no-save`.

**`bun run typecheck` meldet fehlende Typen nach einem Branch-Wechsel.**
Ursache: `next typegen`-Artefakte stammen vom alten Stand. Ausweg: `bun run typecheck` führt `next typegen` selbst aus; bei hartnäckigen Fällen `.next/` löschen und erneut laufen lassen.

**Node-Versionsfehler beim Start.**
Ursache: Host-Node älter als `engines.node` in [`package.json`](../package.json). Ausweg: unterstützte Node-LTS installieren; die verbindliche Untergrenze steht im Repository, nicht in diesem Dokument.

## Docker Compose

**`docker compose up -d --build` bricht am App-Image ab.**
Diagnose: `docker compose config -q` für Syntax, dann Build-Log lesen. Häufige Ursache: Dateien, die der Dockerfile kopiert, fehlen im Build-Kontext oder werden von `.dockerignore` ausgeschlossen.

**App-Container startet, bleibt aber unhealthy.**
Diagnose: `docker compose logs app` und `docker compose logs postgres`. Der Healthcheck ruft `/api/health` auf; der Endpunkt misst ein echtes `SELECT 1` mit Timeouts. Typische Ursachen: `DATABASE_URL` zeigt nicht auf den Compose-Service (`postgres:5432`), oder PostgreSQL war noch nicht healthy (App wartet via `depends_on: service_healthy`, Retry-Fenster beachten).

**PostgreSQL meldet Authentifizierungsfehler nach Änderung der Zugangsdaten.**
Ursache: Das Volume `sitzplan_pgdata` enthält noch die alte Rolle. Ausweg: `docker compose down -v` (löscht alle lokalen Daten!) und neu starten.

**Port 3000 ist belegt.**
Ausweg: `PORT=<freier-port> docker compose up -d` — der Compose-Port-Mapping nutzt die Variable auf der Host-Seite.

## Qualitäts-Gates

**`bash scripts/check-docs.sh` meldet `placeholder found`, obwohl kein TODO geändert wurde.**
Ursache: Der Scan durchsucht `.claude/` rekursiv und trifft lokale Agent-Worktrees unter `.claude/worktrees/`, deren Dateien legitime TODO-Kommentare enthalten. Status: als Issue [#34](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/34) erfasst. Workaround bis zum Fix: Gate im eigenen Feature-Worktree ohne verschachtelte Worktrees laufen lassen oder nach Abschluss der Agent-Läufe erneut ausführen. In CI tritt das Problem nicht auf.

**`git diff --check` meldet Whitespace-Fehler.**
Ausweg: betroffene Zeilen säubern (Trailing Whitespace, Tabs), nicht mit Editor-Excludes übergehen — der Check bleibt Gate.

## Tests

**Vitest schlägt nach Doku-Änderungen fehl.**
Ursache: `tests/docs/*.test.ts` prüft Dokumentationsstruktur (z. B. Pflicht-Einträge in `docs/STATUS.md`). Ausweg: Tests lesen — sie sind die Spezifikation. Assertions niemals abschwächen, sondern die Dokumentation testkonform korrigieren.
