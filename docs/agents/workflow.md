# Agent-Workflow (Detail)

Diese Datei trägt die ausführlichen Workflow- und Verifikationsregeln des Sitzplan-Projektagenten. `AGENTS.md` verlinkt hierher; die Hard-Stops stehen bewusst dort, weil sie immer gelten.

## Verbindlicher Workflow

1. Arbeite nie direkt auf `main`; nutze einen eigenen Branch für genau ein Issue und einen atomaren Commit.
2. Nutze vor Exploration oder Änderung zuerst `code-review-graph`; bestätige Graph-Hinweise am echten Code oder an Tests.
3. Nutze RED → GREEN → Refactor für Verhaltensänderungen und schwäche keine Assertions, Retries oder Gates ab.
4. Aktualisiere nach Änderungen den Graphen mit `code-review-graph update --base HEAD --repo . --brief`.
5. Nutze vor der Übergabe den `coderabbit`-Skill und `cr review --type uncommitted`; prüfe jedes Finding gegen den aktuellen Stand.
6. Übergib erst, wenn alle anwendbaren Checks `0` liefern und ein unabhängiger Reviewer zugestimmt hat.
7. Niemals Secrets, echte Schülerdaten, Provider-Keys oder lokale Hostkonfiguration ins Repository legen.

`APPROVE` ist zusätzliche Evidenz neben grünen Tests/Gates, nie Ersatz, nie allein ausreichend.

## Verifikation und Ausgabe

- Führe immer `git diff --check` aus.
- Dokumentations-Gate: `bash scripts/check-docs.sh`
- Anwendungs-Gates (`bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`) sind seit M0 #27 vorhanden und bei jedem Slice grün zu halten. E2E-Gates sind M7 vorbehalten.
- Berichte geänderte Pfade, ausgeführte Checks mit Exitstatus, validierte CodeRabbit-Findings und offene Risiken.
- Worker-Zusammenfassungen sind Navigationshilfen, keine Evidenz; der Lead prüft Diff, Graph-Auswirkung und Gates selbst.
