# Sitzplan

## Kritische Befehle

- Aktuell gibt es keine ausführbaren Build-, Test-, Lint- oder Run-Skripte. Erfinde keine Befehle.
- Basisprüfung: `git diff --check`
- Graph nach Änderungen: `code-review-graph update --base HEAD --repo . --brief`
- Lokaler Abschlussreview: `cr review --type uncommitted`

## Architekturkarte

- [`docs/product.md`](docs/product.md) ist die verbindliche Produkt- und Architekturquelle; das Repository befindet sich noch in der Design-/Bootstrap-Phase.
- Zielstack: Next.js App Router, TypeScript Strict, React/React-Konva, PostgreSQL, Drizzle, Zod, Better Auth, Vercel AI SDK, IndexedDB und Docker Compose.
- Reine Domänenlogik und Verträge bleiben unabhängig von Framework, Canvas, Datenbank und KI-SDK. Route Handler delegieren an framework-unabhängige Services.
- Fachmodule: Klassenbuch, Raumplaner, Sitzplan-Editor, Persistenz, Regelwerk, Optimierer, KI-Assistent, Export, Provider und Betrieb.

## Harte Regeln

- **IMPORTANT:** Verwende ausschließlich Test- oder Fantasiedaten. Keine echten Schülerdaten, Secrets, Provider-Keys oder lokalen Hostdaten committen.
- **YOU MUST:** Nutze `code-review-graph` vor jeder Code-/Konfigurations-Exploration, jedem Review und jeder Änderung; aktualisiere den Graphen danach.
- **YOU MUST:** Nutze vor dem Abschluss jeder Änderung den `coderabbit`-Skill und die lokale CodeRabbit-CLI. Validiere Findings am aktuellen Stand; CodeRabbit ersetzt weder Tests noch CRG.
- Ein LLM darf niemals Datenbank oder Canvas direkt mutieren. Es liefert nur Zod-validierte, gegen Entitäten geprüfte Kommandovorschläge mit Diff-Vorschau.
- Persistiere versionierte Zod-Domänendokumente, keine Konva-Serialisierung. Restore erzeugt eine neue Revision; harte Sitzregeln bleiben unverletzlich.
- Führe keine separate Backend-Anwendung ein. UI-Komponenten greifen nie direkt auf Datenbank oder KI-Provider zu.

## Workflow-Präferenzen

- Arbeite nie direkt auf `main`; nutze Branch und Pull Request.
- Ein Issue entspricht einem vertikalen Slice, einem Writer, einem atomaren Commit und einem Pull Request.
- Nutze RED → GREEN → Refactor für Verhaltensänderungen. Veröffentliche erst nach allen anwendbaren grünen Gates und unabhängigem Review.
- Halte Änderungen minimal und aktualisiere nur die fachlich passende Dokumentationsquelle im selben Slice.

## Nicht aufnehmen

- Keine Kopie von `docs/product.md`, keine Dateiliste, keine einmaligen Statusmeldungen und keine Regeln, die Tooling bereits erzwingt.
- Ergänze konkrete Projektbefehle erst, wenn die zugehörigen Skripte eingecheckt sind, und ersetze dann den Hinweis unter „Kritische Befehle“.

## Token Efficiency

- Never re-read files you just wrote or edited. You know the contents.
- Never re-run commands to "verify" unless the outcome was uncertain.
- Don't echo back large blocks of code or file contents unless asked.
- Batch related edits into single operations. Don't make 5 edits when 1 handles it.
- Skip confirmations like "I'll continue..." Just do it.
- If a task needs 1 tool call, don't use 3. Plan before acting.
- Do not summarize what you just did unless the result is ambiguous or you need additional input.
