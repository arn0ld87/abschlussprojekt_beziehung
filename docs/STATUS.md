# Projektstatus

**Stand:** 29.07.2026<br>
**Phase:** M0 — Foundation inhaltlich abgeschlossen; M1 — Klassen ist die nächste Frontier<br>
**Produktcode:** noch nicht begonnen

## Verifiziert vorhanden

- bestätigte Produkt- und Architektur-Spezifikation unter `docs/product.md`
- Zielstack und MVP-Grenzen sind entschieden
- Projekt-Bootstrap, Agentenworkflow und Dokumentationsgate sind verifiziert
- dreizehn offene Milestone-Parent-Issues mit dokumentierten Blockern
- Next.js-App-Router-Scaffold (M0 #18)
- Anwendungs-CI mit Lint-, Typecheck- und Vitest-Gates (M0 #19)
- Foundation-Baseline mit Next.js 16.2.11 LTS, ESLint-9-Flat-Config und CI-Build-Gate (M0 #27)
- Runtime-Baseline Node 24 LTS, patch-fähige Next.js-Range (`~16.2.11`) und wöchentlicher Dependabot-Update-Mechanismus mit gruppierten Dev-Dependency-PRs (M0 #31)
- Docker-Compose-Definition und Dockerfile für Anwendung und PostgreSQL samt Healthcheck-Endpunkt `/api/health` mit echtem `SELECT 1` (M0 #20)
- verifizierte Docker-Laufzeit: `docker compose up -d --build` startet Anwendung und PostgreSQL, `/api/health` antwortet erfolgreich nach `SELECT 1` (M0 #20 und #31)
- Designsystem-Grundlage mit Tokens, Basis-Komponenten und Playground-Seite (M0 #21)

## Noch nicht vorhanden

- Datenbankschema und Migrationen
- Release-Artefakt

## M0-Abschluss

M0 — Foundation ist am 29.07.2026 inhaltlich abgeschlossen. Jeder M0-Slice ist mit seinem Merge-Commit auf `main` nachgewiesen; die Pflicht-Checks (Dokumentationsgate, Lint, Typecheck, Vitest, Build) waren auf allen M0-Pull-Requests grün. Der nachträglich ergänzte Blocker [#31 Runtime-Baseline](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/31) ist mit Pull Request [#37](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/37) aufgelöst; damit ist auch der Docker-Compose-Laufzeitnachweis erbracht.

| Slice | Issue | Pull Request | Merge-Commit |
|---|---|---|---|
| Domain-Layout konsolidieren | [#17](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/17) | [#23](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/23) | `d6051ed` |
| Next.js App Router Scaffold | [#18](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/18) | [#25](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/25) | `eb8b969` |
| Anwendungs-CI | [#19](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/19) | [#26](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/26) | `82e3d68` |
| Foundation-Baseline synchronisieren | [#27](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/27) | [#28](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/28) | `381467a` |
| Docker Compose für Anwendung und PostgreSQL | [#20](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/20) | [#29](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/29) | `b002562` |
| Designsystem Grundlage | [#21](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/21) | [#30](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/30) | `954f1d9` |
| Runtime-Baseline Node 24 LTS und Dependency-Updates | [#31](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/31) | [#37](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/37) | `da673c8` |

Der GitHub-Milestone `M0 — Foundation` enthält das Parent-Issue [#2](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/2) und alle sieben M0-Child-Issues (#17, #18, #19, #20, #21, #27, #31). Die formale Schließung von Milestone und Parent-Issue ist noch ausstehend und erfolgt durch den Lead.

## Nächster Freigabepunkt

Die einzige aktuelle Frontier ist [M1 — Klassen](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/3). Das Parent-Issue wird vor Umsetzung über `/to-tickets` in ausführbare Child-Slices zerlegt; es ist selbst nicht `ready-for-agent`.

## Milestone-Frontier

| Milestone | Parent-Issue | Status |
|---|---|---|
| M0 | [#2 Foundation: Repository und Agentenworkflow](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/2) | inhaltlich abgeschlossen (29.07.2026), formale Schließung ausstehend |
| M1 | [#3 Klassen: Auth, Klassen und Schülerprofile](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/3) | einzige aktuelle Frontier |
| M2 | [#4 Raumeditor: Maße, Möbel und Sitzplätze](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/4) | keine offenen Blocker, Reihenfolge nach M1 |
| M3 | [#5 Persistente Pläne: Autosave, Versionen und Restore](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/5) | blockiert durch M1 und M2 |
| M4 | [#6 Optimierer: Regeln, Konflikte und reproduzierbare Vorschläge](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/6) | blockiert durch M3 |
| M5 | [#7 KI-Assistent: BYOK, Chat und validierte Commands](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/7) | blockiert durch M4 |
| M6 | [#8 Ausgabe und PWA: Entwürfe, PDF, PNG und Import/Export](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/8) | blockiert durch M3 |
| M7 | [#9 MVP-Härtung: E2E, Accessibility, Backup und Release](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/9) | blockiert durch M4, M5 und M6 |
| M8 | [#10 Erweiterter Raumeditor: Tischgruppen und freie Sitzplätze](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/10) | blockiert durch M7 |
| M9 | [#11 Decision Gate: Granulareres Persistenzmodell](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/11) | blockiert durch M7 |
| M10 | [#12 Decision Gate: Ereignisprotokoll und Zeitreise](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/12) | blockiert durch M7 und M9 |
| M11 | [#13 Mehrbenutzerbetrieb: Rollen und gemeinsame Vorlagen](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/13) | blockiert durch M7 |
| M12 | [#14 Produktivfreigabe für echte Schuldaten](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/14) | blockiert durch M11 |
