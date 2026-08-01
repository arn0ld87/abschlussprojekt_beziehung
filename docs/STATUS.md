# Projektstatus

**Stand:** 31.07.2026<br>
**Phase:** M0 — Foundation abgeschlossen (29.07.2026, formale Schließung erfolgt); M1 — Klassen abgeschlossen (31.07.2026, formale Schließung erfolgt); M2 — Raumeditor abgeschlossen (31.07.2026, formale Schließung erfolgt); M3 — Persistente Pläne ist die aktuelle Frontier, Child-Slices #56 und #57 umgesetzt<br>
**Produktcode:** Auth-Grundlage (M1 #42), Klassenverwaltung (M1 #43), Schülerprofile und Sitzregeln (M1 #44), persistenter Foto-Upload (M1 #45), CSV-Import für Klassenlisten (M1 #46), Raumvorlagen-Grundlage (M2 #49), Raum-Canvas (M2 #50), Standardobjekte mit Möbelpalette (M2 #51), Objektinteraktion mit Rasterfang (M2 #52), Objektaktionen (M2 #53), adressierbare Sitzplätze (M2 #54), die M2-Akzeptanz (M2 #55), die Sitzplan-Grundlage (M3 #56) und die Schülerzuordnung (M3 #57) vorhanden

## Verifiziert vorhanden

- bestätigte Produkt- und Architektur-Spezifikation unter `docs/product.md`
- Zielstack und MVP-Grenzen sind entschieden
- Projekt-Bootstrap, Agentenworkflow und Dokumentationsgate sind verifiziert
- zehn offene Milestone-Parent-Issues (M3–M12, #5–#14) mit dokumentierten Blockern
- Next.js-App-Router-Scaffold (M0 #18)
- Anwendungs-CI mit Lint-, Typecheck- und Vitest-Gates (M0 #19)
- Foundation-Baseline mit Next.js 16.2.11 LTS, ESLint-9-Flat-Config und CI-Build-Gate (M0 #27)
- Runtime-Baseline Node 24 LTS, patch-fähige Next.js-Range (`~16.2.11`) und wöchentlicher Dependabot-Update-Mechanismus mit gruppierten Dev-Dependency-PRs (M0 #31)
- Docker-Compose-Definition und Dockerfile für Anwendung und PostgreSQL samt Healthcheck-Endpunkt `/api/health` mit echtem `SELECT 1` (M0 #20)
- verifizierte Docker-Laufzeit: `docker compose up -d --build` startet Anwendung und PostgreSQL, `/api/health` antwortet erfolgreich nach `SELECT 1` (M0 #20 und #31)
- Designsystem-Grundlage mit Tokens, Basis-Komponenten und Playground-Seite (M0 #21)
- Auth-Grundlage mit E-Mail/Passwort, Session-Verwaltung, Drizzle-Migration und geschützter Beispielseite (M1 #42)
- Klassenverwaltung mit CRUD, Soft-Delete, Zod-Validierung, framework-freiem KlassenService, Route Handlern und UI-Seiten (M1 #43)
- Schülerprofile mit allen Produktfeldern und strukturierten Sitzregeln (`front_seat`, `quiet_area`, `near_to`, `away_from`; hart/gewichtet) inklusive Soft-Delete, Ownership-Prüfung und Property-Tests (M1 #44, Merge `0ad3d0b`)
- persistenter Foto-Upload mit Metadaten-Tabelle, UUIDv4-Dateinamen, Größen- und MIME-Validierung sowie Docker-Volume `sitzplan_uploads` (M1 #45, PR [#65](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/65), Merge `2518ef4`)
- CSV-Import für Klassenlisten mit Vorschau, zeilenweisen Fehlern, Bestätigungspflicht und Duplikatstrategie `skip | update | duplicate` (M1 #46, PR [#68](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/68), Merge `1e0a96c`)
- Raumvorlagen-Grundlage mit CRUD, Ownership, Soft-Delete, realen Maßen, Raster und versioniertem, Konva-freiem `RaumDokumentV1` (JSONB) samt Route Handlern und Editor-Shell (M2 #49, erstes M2-Child)
- React-Konva-Editorfläche mit framework-freier cm↔px-Koordinatentransformation, exaktem Seitenverhältnis, responsiver Skalierung und sichtbarem, nicht persistiertem Raster (M2 #50)
- Möbelpalette mit den sechs MVP-Standardobjekten als diskriminierter Zod-Union `RaumObjektV1`, UUID-Objekt-IDs, cm-Maßen, geklemmten Startpositionen und objektrendernder Editorfläche (M2 #51)
- Objektinteraktion mit Einzelauswahl (Maus/Tastatur), sichtbarer Auswahlmarkierung, Drag-and-drop mit serverseitigem Rasterfang, rotationsbereinigter Raumgrenzen-Begrenzung und Rollback bei Speicherfehlern (M2 #52)
- Objektaktionen: Rotation in 90-Grad-Schritten, Duplizieren mit neuer UUID und rasterversetzter Position, Löschen mit Bestätigung — per Toolbar und Tastaturkürzeln (R/D/Entf), mit Reload-beweisender Aktionsfolge (M2 #53)
- Adressierbare Sitzplätze an Einzel- und Doppeltischen mit stabilen IDs, lokalem Anker, `RaumDokumentV3` samt validierter Migration, sichtbaren Markern und zugänglicher Liste; Verschieben/Drehen bewahrt IDs, Duplizieren erzeugt disjunkte IDs, Löschen entfernt Sitzplätze atomar (M2 #54)
- M2-Akzeptanz-Evidenz: PostgreSQL-Integrationstest über den vollständigen Akzeptanzpfad (Anlegen → Maße/Raster → alle sechs Objekte → Verschieben/Drehen/Duplizieren/Löschen → Sitzplätze → Reload identisch), JSONB-Konva-Freiheits- und Versionsvertrag, Ownership-Nachweis, Accessibility-Vertragstest (statisches Markup + Quell-Vertrag) und visueller Referenzzustand (M2 #55)
- Sitzplan-Grundlage: Tabelle `sitzplaene` mit Migration `0006_sitzplaene.sql`, versionierter und Konva-freier Zod-Vertrag `SitzplanDokumentV1` (eingefrorene Raumgeometrie samt stabiler Sitzplatz-IDs, Quellmetadaten, leere Zuordnung), framework-freier `SitzplanService` mit delegierter Ownership-Prüfung für Klasse und Raumvorlage, Route Handler unter `/api/sitzplaene` sowie UI `/sitzplaene`, `/sitzplaene/neu` und Editor-Shell `/sitzplaene/[id]`; Snapshot-Isolation ist gegen Test-PostgreSQL nachgewiesen (M3 #56)
- Schülerzuordnung: normalisierte, deterministisch nach `sitzplatzId` sortierte Zuordnungsliste im bestehenden jsonb-`canvasDocument` (keine Migration nötig) mit drei harten, per `superRefine` erzwungenen Invarianten (nur Sitzplätze der eingefrorenen Geometrie, höchstens ein Schüler je Sitzplatz, höchstens ein Sitzplatz je Schüler), framework-freie Commands `setzeSchueler`/`tausche`/`entferne` ohne React-, Konva- oder Drizzle-Bezug, serverseitig erzwungene Klassenzugehörigkeit und Soft-Delete-Prüfung im `SitzplanService`, Route Handler `PUT /api/sitzplaene/[id]/zuordnungen` (schreibt das vollständige validierte Dokument, noch ohne Debounce-Autosave), abgeleitete Ablage samt Inkonsistenzbefund für nicht mehr aktive Schülerprofile (Befund blockiert das Laden nicht) sowie Editor-UI mit Konva-Sitzplandarstellung, Drag-and-drop und gleichwertiger Tastaturbedienung über Auswahl und Aktion; Eindeutigkeit und Referenzintegrität sind über Property-Tests nach beliebigen Command-Folgen belegt (M3 #57)

## Noch nicht vorhanden

- Autosave, Undo/Redo, Planversionen und Restore im Sitzplan-Editor
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

Der GitHub-Milestone [`M0 — Foundation`](https://github.com/arn0ld87/abschlussprojekt_beziehung/milestone/1) wurde am 29.07.2026 geschlossen (`closed_at=2026-07-29T00:02:34Z`, `open_issues=0`, `closed_issues=9`). Er enthält das Parent-Issue [#2](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/2) und alle sieben M0-Child-Issues (#17, #18, #19, #20, #21, #27, #31); die zugehörige M0-Akzeptanz [#22](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/22) ist gemergt. Das Parent-Issue und alle sieben Child-Issues sind `CLOSED`.

## M1-Abschluss

M1 — Klassen ist am 29.07.2026 inhaltlich abgeschlossen. Jeder M1-Slice ist mit seinem Merge-Commit auf `main` nachgewiesen; die Pflicht-Checks (Dokumentationsgate, Lint, Typecheck, Vitest, Build) waren auf allen M1-Pull-Requests grün.

| Slice | Issue | Pull Request | Merge-Commit |
|---|---|---|---|
| Auth und Datenbank-Grundlage | [#42](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/42) | [#47](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/47) | `ed812e2` |
| Klassenverwaltung | [#43](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/43) | [#64](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/64) | `2bbf8d0` |
| Schülerprofile und Sitzregeln | [#44](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/44) | — | `0ad3d0b` |
| Persistenter Foto-Upload | [#45](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/45) | [#65](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/65) | `2518ef4` |
| CSV-Import für Klassenlisten | [#46](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/46) | [#68](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/68) | `1e0a96c` |

Der GitHub-Milestone `M1 — Klassen` wurde am 31.07.2026 formal geschlossen. Er enthält das Parent-Issue [#3](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/3) und alle fünf M1-Child-Issues (#42–#46). Das Parent-Issue und alle Child-Issues sind `CLOSED`.

## M2-Abschluss

M2 — Raumeditor ist am 30.07.2026 inhaltlich abgeschlossen. Jeder M2-Slice ist mit seinem Merge-Commit auf `main` nachgewiesen; die Pflicht-Checks (Dokumentationsgate, Lint, Typecheck, Vitest, Build) waren auf allen M2-Pull-Requests grün. Die Akzeptanz [#55](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/55) weist den vollständigen Akzeptanzpfad gegen Test-PostgreSQL nach (Anlegen → Maße/Raster → alle sechs Objekte → Verschieben/Drehen/Duplizieren/Löschen → Sitzplätze → Reload identisch), dazu JSONB-Konva-Freiheit, V1-Bestandsmigration auf `RaumDokumentV3`, Ownership, einen Accessibility-Vertragstest und den visuellen Referenzzustand.

| Slice | Issue | Pull Request | Merge-Commit |
|---|---|---|---|
| Raumvorlagen-Grundlage | [#49](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/49) | [#76](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/76) | `10077cd` |
| Raum-Canvas | [#50](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/50) | [#77](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/77) | `c42d6f6` |
| Standardobjekte und Möbelpalette | [#51](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/51) | [#78](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/78) | `19e86a9` |
| Objektinteraktion mit Rasterfang | [#52](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/52) | [#79](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/79) | `808506b` |
| Objektaktionen (Drehen, Duplizieren, Löschen) | [#53](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/53) | [#80](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/80) | `7ff21f9` |
| Adressierbare Sitzplätze | [#54](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/54) | [#81](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/81) | `9443ed4` |
| M2-Akzeptanz | [#55](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/55) | [#82](https://github.com/arn0ld87/abschlussprojekt_beziehung/pull/82) | siehe Merge-Verlauf |

Der GitHub-Milestone `M2 — Raumeditor` wurde am 31.07.2026 formal geschlossen. Er enthält das Parent-Issue [#4](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/4) und alle sieben M2-Child-Issues (#49–#55). Das Parent-Issue und alle Child-Issues sind `CLOSED`.

## Nächster Freigabepunkt

M1 und M2 sind vollständig abgeschlossen (alle Child-Slices, Akzeptanzpfade, Parent-Issues und Milestones). Damit ist [M3 — Persistente Pläne](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/5) (Autosave, Versionen und Restore mit neuer Revision je Restore, siehe `docs/superpowers/specs/2026-07-29-m2-m3-ticketing-design.md`) die aktuelle Frontier. Der erste M3-Child-Slice [#56](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/56) (Sitzplan-Grundlage) ist umgesetzt: Klasse und Raumvorlage werden zu einem persistenten Plan mit eingefrorener Raumgeometrie verbunden. Der zweite Child-Slice [#57](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/57) (Schülerzuordnung) ist umgesetzt: Ablage, Drag-and-drop, tastaturbedienbare Alternative und der validierte Schreibpfad für Sitzplatzbelegungen — Autosave, Undo/Redo und Planversionen bleiben ausdrücklich späteren Slices vorbehalten. Der nächste Freigabepunkt ist die Freigabe des folgenden M3-Child-Slices mit Label `ready-for-agent` durch den Lead.

## Milestone-Frontier

| Milestone | Parent-Issue | Status |
|---|---|---|
| M0 | [#2 Foundation: Repository und Agentenworkflow](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/2) | abgeschlossen (29.07.2026, Milestone und Issues formal geschlossen) |
| M1 | [#3 Klassen: Auth, Klassen und Schülerprofile](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/3) | abgeschlossen (31.07.2026, Milestone und Issues formal geschlossen) |
| M2 | [#4 Raumeditor: Maße, Möbel und Sitzplätze](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/4) | abgeschlossen (31.07.2026, Milestone und Issues formal geschlossen) |
| M3 | [#5 Persistente Pläne: Autosave, Versionen und Restore](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/5) | aktuelle Frontier — Child-Issues [#56](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/56) (Sitzplan-Grundlage) und [#57](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/57) (Schülerzuordnung) umgesetzt |
| M4 | [#6 Optimierer: Regeln, Konflikte und reproduzierbare Vorschläge](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/6) | blockiert durch M3 |
| M5 | [#7 KI-Assistent: BYOK, Chat und validierte Commands](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/7) | blockiert durch M4 |
| M6 | [#8 Ausgabe und PWA: Entwürfe, PDF, PNG und Import/Export](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/8) | blockiert durch M3 |
| M7 | [#9 MVP-Härtung: E2E, Accessibility, Backup und Release](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/9) | blockiert durch M4, M5 und M6 |
| M8 | [#10 Erweiterter Raumeditor: Tischgruppen und freie Sitzplätze](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/10) | blockiert durch M7 |
| M9 | [#11 Decision Gate: Granulareres Persistenzmodell](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/11) | blockiert durch M7 |
| M10 | [#12 Decision Gate: Ereignisprotokoll und Zeitreise](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/12) | blockiert durch M7 und M9 |
| M11 | [#13 Mehrbenutzerbetrieb: Rollen und gemeinsame Vorlagen](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/13) | blockiert durch M7 |
| M12 | [#14 Produktivfreigabe für echte Schuldaten](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/14) | blockiert durch M11 |
