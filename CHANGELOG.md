# Changelog

Alle relevanten Änderungen an Sitzplan werden in dieser Datei dokumentiert.

## Unreleased

## M2 — Raumeditor — 30.07.2026

**Betroffene Bereiche:** Raumvorlagen mit versioniertem JSONB-Dokument, Konva-Editorfläche, Standardobjekte und Möbelpalette, Objektinteraktion mit Rasterfang, Objektaktionen, adressierbare Sitzplätze, M2-Akzeptanz.

**Child-Issues:** #49 (PR [#76](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/76), Merge `10077cd`), #50 (PR [#77](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/77), Merge `c42d6f6`), #51 (PR [#78](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/78), Merge `19e86a9`), #52 (PR [#79](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/79), Merge `808506b`), #53 (PR [#80](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/80), Merge `7ff21f9`), #54 (PR [#81](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/81), Merge `9443ed4`), #55 (PR [#82](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/82)). Das Parent-Issue #4 bleibt bis zur formalen M2-Schließung offen.

### Added

- Raumvorlagen-Grundlage (M2 #49): Drizzle-Tabelle `raeume` mit Migration `0005_raeume.sql`, versionierter und Konva-freier Zod-Vertrag `RaumDokumentV1` (JSONB, `version: 1`, Maße, Raster, leere Objektliste), framework-freier `RaumService` mit Ownership- und Raster-Validierung, Route Handler unter `/api/raeume` sowie UI `/raeume`, `/raeume/neu` und Editor-Shell `/raeume/[id]` (Editorfläche folgt mit M2 #50)
- Raum-Canvas (M2 #50): React-Konva-Editorfläche auf `/raeume/[id]` mit Raumgrenze und sichtbarem Raster, framework-freie Koordinatentransformation (`src/domain/raum/koordinaten.ts`) mit exaktem Seitenverhältnis und responsiver Skalierung, Live-Vorschau bei Maß-/Rasteränderungen; neue Runtime-Dependencies `react-konva` und `konva` (ADR-0002)
- Standardobjekte (M2 #51): diskriminierte Zod-Union `RaumObjektV1` mit den sechs MVP-Objektarten (`table_single`, `table_double`, `teacher_desk`, `board`, `door`, `window`), UUID-basierte Objekt-IDs, fachliche Maße in Zentimetern, Standardmaße und geklemmte Startpositionen, neue Dokumentversion `RaumDokumentV2` mit validierter V1→V2-Migration (ADR-0003), rotationsbereinigte Grenzvalidierung exakt entlang der Renderer-Semantik, Serviceaktion `addObjekt`, Route Handler `POST /api/raeume/[id]/objekte`, Möbelpalette auf `/raeume/[id]` und objektrendernder Konva-Renderer ohne Persistenzlogik
- Objektinteraktion (M2 #52): Auswahl genau eines Raumobjekts per Maus/Tap/Tastatur (Objektliste mit `aria-pressed`), sichtbare Auswahlmarkierung ohne Persistenz, Drag-and-drop mit flüssiger Vorschau und serverseitigem Rasterfang, framework-freie Domänenfunktionen `rundeAufRaster`/`bewegeObjektAufRaster` (idempotent, rotationsbereinigt an den Raumgrenzen), Serviceaktion `bewegeObjekt`, Route Handler `PATCH /api/raeume/[id]/objekte/[objektId]` und Rollback auf den letzten bestätigten Dokumentstand bei Speicherfehlern
- Objektaktionen (M2 #53): Rotation in normalisierten 90-Grad-Schritten (Bounds rotationsbereinigt), Duplizieren mit neuer UUID und rasterversetzter Position inklusive verständlicher Ablehnung ohne freien Platz, Löschen mit Bestätigung und exaktem Delete-Scope, framework-freie Commands (`rotiereObjekt`, `berechneDuplikatPosition`, `entferneObjekt`), Toolbar mit `role="toolbar"` und dokumentierte Tastaturkürzel (R/D/Entf), Route Handler `POST /api/raeume/[id]/objekte/[objektId]/aktionen` und `DELETE /api/raeume/[id]/objekte/[objektId]`
- Adressierbare Sitzplätze (M2 #54): Zod-Vertrag `SitzplatzV1` mit stabiler, aus der Objekt-ID abgeleiteter ID, Parent-Objekt-ID, lokalem Anker und Bezeichnung, deterministische Sitzplatzgeometrie (Einzeltisch 1 Platz, Doppeltisch 2 Plätze auf der Stirnseite), neue Dokumentversion `RaumDokumentV3` mit validierter V2→V3-Migration samt Parent-Integritäts- und Geometrie-Validierung (ADR-0003), framework-freie Funktionen (`erzeugeSitzplaetze`, `sitzplatzWeltPosition`, `dupliziereSitzplaetze`, `entferneSitzplaetzeVon`), atomare Mitführung in den Objektaktionen (Erzeugen mit dem Tisch, ID-Stabilität bei Bewegen/Drehen, disjunkte IDs beim Duplizieren, Löschen im selben Command), sichtbare Sitzplatzmarker im Konva-Canvas und zugängliche Sitzplatzliste im Editor
- M2-Akzeptanz (M2 #55): PostgreSQL-Integrationstest (`tests/raum/raum-postgres.integration.test.ts`, opt-in via `TEST_DATABASE_URL`) über den vollständigen Akzeptanzpfad inklusive Reload-Identität, JSONB-Konva-Freiheits- und Versionsvertrag, V1-Bestandsmigration auf `RaumDokumentV3` und Ownership-Nachweis; Accessibility-Vertragstest (`tests/raum/raum-a11y.test.tsx`) aus statischem Markup und Quell-Vertrag; visueller Referenzzustand in `tests/raum/raum-canvas.test.tsx`

### Fixed

- Objektliste im Editor übergibt den Auswahlzustand jetzt über die `ariaPressed`-Prop der Button-Komponente statt eines verworfenen `aria-pressed`-Attributs — die Auswahl ist damit tatsächlich für Assistenztechnologie sichtbar (M2 #55)

## M1 — Klassen — 29.07.2026

**Betroffene Bereiche:** Auth und Datenbank-Grundlage, Klassenverwaltung, Schülerprofile und Sitzregeln, persistenter Foto-Upload, CSV-Import.

**Child-Issues:** #42 (PR [#47](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/47), Merge `ed812e2`), #43 (PR [#64](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/64), Merge `2bbf8d0`), #44 (Merge `0ad3d0b`), #45 (PR [#65](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/65), Merge `2518ef4`), #46 (PR [#68](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/68), Merge `1e0a96c`). Das Parent-Issue #3 bleibt bis zur formalen M1-Schließung offen.

### Added

- E-Mail/Passwort-Registrierung und -Anmeldung über den framework-freien `AuthService` mit `sitzplan_session`-Cookie, PostgreSQL-Sessions und geschützter Beispielseite (M1 #42)
- Drizzle-Migrationen und Datenbank-Testinfrastruktur: `0001_init_auth.sql` (M1 #42), `0002_klassen.sql` (M1 #43), `0003_schueler_sitzregeln.sql` (M1 #44), `0004_fotos.sql` (M1 #45)
- Klassenverwaltung mit CRUD, Soft-Delete via `deleted_at`, Ownership-Prüfung und framework-freiem `KlassenService` (M1 #43)
- Schülerprofile mit `name`, `initialen`, `farbe`, `lernstand`, `verhalten`, `freitextnotizen` und `foto_placeholder_id` (M1 #44)
- strukturierte Sitzregeln (`front_seat`, `quiet_area`, `near_to`, `away_from`) mit Härte `hard | weighted`, Gewicht in [0,1] und service-seitiger Peer-Validierung innerhalb derselben Klasse (M1 #44)
- persistenter Foto-Upload mit UUIDv4-Dateinamen, 5-MB-Limit, MIME- und Magic-Byte-Prüfung, ETag-Auslieferung und Docker-Volume `sitzplan_uploads` (M1 #45)
- CSV-Import für Klassenlisten mit dokumentiertem Spalten-Mapping, Vorschau mit zeilenweisen Fehlern, bestätigungspflichtigem Commit und Duplikatstrategie `skip | update | duplicate` (M1 #46)
- Route Handler für Schüler, Sitzregeln, Foto und CSV-Import unter `/api/klassen/[id]/...` mit Ownership- und Auth-Prüfung (M1 #44–#46)
- UI im Klassendetail: Schülerliste, Schülerformular, Sitzregel-Editor, Foto-Uploader und CSV-Import-Modal (M1 #44–#46)
- Property-Tests für Sitzregel-Symmetrie/-Eindeutigkeit, Foto-Dateinamen-Form und CSV-Parser-Permutationsstabilität (M1 #44–#46)

### Known limitations

- Die ausgelieferte Auth-Strecke nutzt den eigenen `AuthService` mit `sitzplan_session`-Cookie; die vorhandene Better-Auth-Konfiguration (`src/infrastructure/auth/better-auth.ts`) ist von keinem Route Handler importiert und damit nicht live. Eine etwaige Umstellung auf Better Auth ist eigenständig nachzuholen (M1 #42).

## M0 — Foundation — 29.07.2026

**Betroffene Bereiche:** Repository-Governance, Dokumentationslayout, Next.js-Scaffold, Anwendungs-CI, Runtime-Baseline, Docker-Compose und Designsystem.

**Child-Issues:** #17 (PR #23, Merge `d6051ed`), #18 (PR #25, Merge `eb8b969`), #19 (PR #26, Merge `82e3d68`), #20 (PR #29, Merge `b002562`), #21 (PR #30, Merge `954f1d9`), #27 (PR #28, Merge `381467a`), #31 (PR #37, Merge `da673c8`). Die M0-Akzeptanz läuft über #22; der Milestone `M0 — Foundation` enthält zusätzlich das Parent-Issue #2.

### Added

- Domain-Layout mit Single-Context-Pointer-Dateien unter `docs/context/` (M0 #17)
- Next.js-App-Router-Scaffold mit TypeScript Strict (M0 #18)
- Anwendungs-CI mit Lint-, Typecheck- und Vitest-Jobs (M0 #19)
- Docker Compose-Definition für die Next.js-Anwendung und PostgreSQL (M0 #20)
- Multi-Stage-Dockerfile mit Bun-Lockfile-Modus und Standalone-Build (M0 #20)
- Infrastruktur-Healthcheck-Route `/api/health` mit echtem `SELECT 1` gegen PostgreSQL (M0 #20)
- `.env.example` mit allen erforderlichen Compose-Variablen ohne Werte (M0 #20)
- `.dockerignore` und Compose-Artefakt-Ignores in `.gitignore` (M0 #20)
- `pg` als vierte Runtime-Dependency für den Postgres-Healthcheck (M0 #20)
- app-Healthcheck im Compose-File über Bun-natives `fetch` statt `curl` (M0 #20, oven/bun-Image enthält kein curl)
- Compose-Substitutions-Defaults für `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` und `PORT` (M0 #20)
- Designsystem-Tokens und Basis-Komponenten mit Playground-Seite `/design` (M0 #21)
- Runtime-Baseline auf Node 24 LTS mit nachgewiesenen Engines und `packageManager`-Pin (M0 #31)
- wöchentlicher Dependabot-Update-Mechanismus mit gruppierten Dev-Dependency-PRs (M0 #31)
- getracktes `public/.gitkeep` als Docker-Build-Fix für den Runner-Stage-Copy (M0 #31)
- Container-Build-Nachweis als zusätzlicher CI-Job (M0 #31)

### Known limitations

- Das Container-Image für M0 #20 kopiert nur den Next.js-Standalone-Server und `public/`; `.next/static` wird nicht mitgegeben. Der Healthcheck-Endpunkt `/api/health` ist rein dynamisch und benötigt keine statischen Assets. Statische Seiten und Client-Chunks stehen im Container daher erst ab M1+ zur Verfügung, wenn der Health-Only-Scope zugunsten echter UI-Routen erweitert wird.

### Changed

- Foundation-Baseline auf Next.js 16.2.11 LTS mit ESLint-9-Flat-Config und CI-Build-Gate (M0 #27)
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
- Bootstrap-Gate prüft die vollständige MiniMax-Agenten- und Ein-Issue-Workflow-Konfiguration
