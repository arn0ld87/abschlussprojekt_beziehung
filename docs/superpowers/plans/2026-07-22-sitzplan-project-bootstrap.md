# Sitzplan Project Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das leere Repository wird in eine widerspruchsfreie, agententaugliche Projektbasis mit Dokumentationshierarchie, ADRs, Matt-Pocock-Konfiguration, MiniMax-M3-Agenten, GitHub-Arbeitsvorlagen und ausführbaren Milestone-Parent-Issues überführt.

**Architecture:** Dieser Plan implementiert ausschließlich Governance und Projekt-Bootstrap, noch keine Anwendungsfunktionen. `docs/product.md` bleibt die bestätigte Produktspezifikation; `README.md`, `docs/STATUS.md`, `ROADMAP.md` und GitHub Issues bilden die aktiven Arbeitsquellen. Jeder spätere Produkt-Milestone wird mit Matt Pococks `/to-tickets` in vertikale, innerhalb eines frischen Kontextfensters umsetzbare Slices zerlegt.

**Tech Stack:** Markdown, GitHub Issues/Actions, Claude Code Plugin `mattpocock/skills`, MiniMax-M3-Agenten, Bash-Prüfskripte; Zielstack der späteren Anwendung: Next.js App Router, TypeScript Strict, React-Konva, PostgreSQL, Drizzle ORM, Zod, Better Auth, Vercel AI SDK, IndexedDB und Docker Compose.

## Global Constraints

- Ziel-Repository ist `arn0ld87/abschlussprojekt_beziehung`; es ist am 22.07.2026 öffentlich und muss vor einer Nutzung mit echten Daten privat werden.
- Der MVP ist ein Single-User-Prototyp für Test- und Fantasiedaten.
- Aktive Arbeitsquellen gelten in dieser Reihenfolge: `README.md` → `docs/STATUS.md` → `ROADMAP.md` → GitHub Issues.
- `docs/product.md` ist die bestätigte Produkt- und Architektur-Spezifikation.
- Architekturentscheidungen liegen ausschließlich unter `docs/decisions/`.
- Konkrete Arbeit liegt ausschließlich in GitHub Issues; Planungsduplikate außerhalb der aktiven Hierarchie sind verboten.
- Ein Issue entspricht einem vertikalen, testbaren Slice und einem atomaren Pull Request.
- Nie direkt auf `main` arbeiten; eine einmalige Ausnahme gilt nur für den initialen Bootstrap auf dem zuvor leeren Repository (Commit 3effa52). Ab dem ersten Folge-Issue gilt strikter PR-Workflow.
- Verhaltensänderungen folgen RED → GREEN → Refactor.
- MiniMax-M3 ist Hauptentwickler; ein frischer Read-only-Reviewer prüft jeden Issue-Commit.
- Maximal zwei nachweislich unabhängige schreibende Worker arbeiten gleichzeitig.
- Sprachmodelle dürfen in der späteren Anwendung nur validierte Domänenkommandos vorschlagen und nie direkt Canvas oder Datenbank verändern.
- Der spätere Optimierer ist deterministisch; gleiche Eingaben und gleicher Seed erzeugen dasselbe Ergebnis.
- Der Bootstrap fügt noch keine Next.js-Anwendung und keine Produktivabhängigkeiten hinzu.

---

## Geplante Dateistruktur

```text
README.md                              Produkt, Einstieg, Grenzen, Doku-Hierarchie
AGENTS.md                              gemeinsame Regeln aller Coding-Agenten
CLAUDE.md                              Claude-Code-/MiniMax-Orchestrierung
CONTEXT.md                             kanonisches Domänenvokabular
ROADMAP.md                             strategische Milestone-Reihenfolge
CHANGELOG.md                           ausgeliefertes Verhalten
CONTRIBUTING.md                        Branch-, TDD-, Commit- und PR-Regeln
SECURITY.md                            Prototypgrenze und Secret-Regeln
docs/STATUS.md                         verifizierter Istzustand
docs/product.md                        bereits bestätigte Produktspezifikation
docs/architecture.md                   Modulgrenzen und Abhängigkeitsrichtung
docs/decisions/README.md               ADR-Index und Statuslegende
docs/decisions/0001-nextjs-fullstack.md
docs/decisions/0002-react-konva-editor.md
docs/decisions/0003-relational-jsonb-canvas.md
docs/decisions/0004-autosave-snapshots.md
docs/decisions/0005-ai-validated-commands.md
docs/decisions/0006-deterministic-optimizer.md
docs/decisions/0007-openai-compatible-and-ollama.md
docs/decisions/0008-single-user-test-data.md
docs/decisions/0009-indexeddb-drafts.md
docs/decisions/0010-defer-granular-events.md
docs/agents/issue-tracker.md            Matt-Pocock-Issue-Tracker-Konfiguration
docs/agents/triage-labels.md            kanonische Triage-Rollen
docs/agents/domain.md                   Single-Context-Domänenlayout
docs/runbooks/next-task.md              ein Issue pro Lauf
docs/runbooks/release.md                Release-Gates
docs/runbooks/backup-restore.md         Zielablauf für M6/M7
docs/prompts/minimax-m3-master.md        Hauptprompt für die Entwicklung
.claude/agents/*.md                     spezialisierte MiniMax-M3-Agenten
.claude/commands/sitzplan-next-task.md  ein deterministischer Issue-Lauf
.github/ISSUE_TEMPLATE/feature.yml      ausführbarer Slice
.github/ISSUE_TEMPLATE/bug.yml          reproduzierbarer Fehler
.github/PULL_REQUEST_TEMPLATE.md        Scope, Tests, Migration, Rollback
.github/workflows/docs.yml              Bootstrap-Dokumentationsgate
scripts/check-docs.sh                   lokale Spiegelprüfung des Gates
```

## Task 1: Aktive Dokumentationshierarchie anlegen

**Files:**
- Create: `README.md`
- Create: `docs/STATUS.md`
- Create: `ROADMAP.md`
- Create: `CHANGELOG.md`
- Modify: `docs/product.md`

**Interfaces:**
- Consumes: bestätigte Anforderungen aus `docs/product.md`.
- Produces: eindeutige Arbeitsquellen, Release-Bezeichnungen `M0` bis `M12` und verifizierbaren Istzustand.

- [ ] **Step 1: Schreibe einen zunächst fehlschlagenden Hierarchie-Check**

Create `scripts/check-docs.sh` with:

```bash
#!/usr/bin/env bash
set -euo pipefail

required=(
  README.md
  AGENTS.md
  CLAUDE.md
  CONTEXT.md
  ROADMAP.md
  CHANGELOG.md
  CONTRIBUTING.md
  SECURITY.md
  docs/STATUS.md
  docs/product.md
  docs/architecture.md
  docs/decisions/README.md
  docs/agents/issue-tracker.md
  docs/agents/triage-labels.md
  docs/agents/domain.md
  docs/prompts/minimax-m3-master.md
)

for file in "${required[@]}"; do
  test -s "$file" || { echo "missing-or-empty: $file" >&2; exit 1; }
done

grep -Fq 'README.md` → `docs/STATUS.md` → `ROADMAP.md` → GitHub Issues' README.md
grep -Fq 'M0 — Foundation' ROADMAP.md
grep -Fq 'M7 — MVP-Härtung' ROADMAP.md
grep -Fq 'M12 — Produktivfreigabe' ROADMAP.md

placeholder_pattern='TO''DO|T''BD|FIX''ME|PLACE''HOLDER|\?\?\?'
if rg -n "$placeholder_pattern" \
  README.md AGENTS.md CLAUDE.md CONTEXT.md ROADMAP.md CHANGELOG.md \
  CONTRIBUTING.md SECURITY.md docs .github scripts \
  --glob '*.md' --glob '*.yml' --glob '*.yaml' --glob '*.sh' \
  --glob '!docs/superpowers/plans/**' --glob '!scripts/check-docs.sh'; then
  echo 'placeholder found' >&2
  exit 1
fi

echo 'docs-check: ok'
```

- [ ] **Step 2: Führe den Check aus und bestätige den erwarteten Fehler**

Run: `bash scripts/check-docs.sh`
Expected: exit `1`, first missing file is `README.md`.

- [ ] **Step 3: Erstelle README, STATUS, ROADMAP und CHANGELOG**

`README.md` must contain exactly these top-level sections in this order:

```markdown
# Sitzplan

Grafische, selbst gehostete Single-User-PWA zum Erstellen, dauerhaften Speichern, Wiederherstellen und KI-gestützten Optimieren von Sitzordnungen.

> **Projektstatus: M0 — Foundation.** Der aktuelle Stand ist ein Entwicklungsprototyp für Test- und Fantasiedaten. Nicht mit echten Schuldaten verwenden.

## Produktziel
## MVP in Kürze
## Geplanter Stack
## Entwicklungsstatus
## Dokumentationshierarchie
## Arbeitsweise
## Projektgrenzen
## Repository
```

Under `Dokumentationshierarchie`, include the exact line:

```markdown
`README.md` → `docs/STATUS.md` → `ROADMAP.md` → GitHub Issues
```

`docs/STATUS.md` must state verifiable bootstrap facts only:

```markdown
# Projektstatus

**Stand:** 22.07.2026
**Phase:** M0 — Foundation
**Produktcode:** noch nicht begonnen

## Verifiziert vorhanden

- bestätigte Produkt- und Architektur-Spezifikation unter `docs/product.md`
- Zielstack und MVP-Grenzen sind entschieden
- Projekt-Bootstrap und Agentenworkflow sind geplant

## Noch nicht vorhanden

- Next.js-Anwendung
- Datenbankschema und Migrationen
- automatisierte Produkt-Tests
- Docker-Laufzeit
- Release-Artefakt

## Nächster Freigabepunkt

M0 ist abgeschlossen, wenn Repository-Governance, ADRs, Agentenkonfiguration, Issue-Vorlagen, Dokumentationsgate und Milestone-Parent-Issues verifiziert sind.
```

`ROADMAP.md` must define `M0` through `M12` using the exact names and order from `docs/product.md`, and each milestone must contain `Ziel`, `Freigabekriterien`, and `Nicht enthalten`. Application details belong in issues, not in the roadmap.

`CHANGELOG.md` starts with:

```markdown
# Changelog

Alle relevanten Änderungen an Sitzplan werden in dieser Datei dokumentiert.

## Unreleased

### Added

- bestätigte Produkt- und Architektur-Spezifikation
- Projekt-Bootstrap-Plan
```

Update the target repository line in `docs/product.md` only if it differs from `arn0ld87/abschlussprojekt_beziehung`.

- [ ] **Step 4: Prüfe die neu angelegten Quellen gezielt**

Run:

```bash
test -s README.md
test -s docs/STATUS.md
test -s ROADMAP.md
test -s CHANGELOG.md
rg -n '^# |^## ' README.md docs/STATUS.md ROADMAP.md CHANGELOG.md
```

Expected: exit `0`; headings for all four files are printed.

- [ ] **Step 5: Committe die Dokumentationshierarchie**

```bash
git add README.md docs/STATUS.md docs/product.md ROADMAP.md CHANGELOG.md scripts/check-docs.sh
git commit -m "docs: establish project source hierarchy"
```

## Task 2: Domänenkontext, Architektur und ADRs festschreiben

**Files:**
- Create: `CONTEXT.md`
- Create: `docs/architecture.md`
- Create: `docs/decisions/README.md`
- Create: `docs/decisions/0001-nextjs-fullstack.md`
- Create: `docs/decisions/0002-react-konva-editor.md`
- Create: `docs/decisions/0003-relational-jsonb-canvas.md`
- Create: `docs/decisions/0004-autosave-snapshots.md`
- Create: `docs/decisions/0005-ai-validated-commands.md`
- Create: `docs/decisions/0006-deterministic-optimizer.md`
- Create: `docs/decisions/0007-openai-compatible-and-ollama.md`
- Create: `docs/decisions/0008-single-user-test-data.md`
- Create: `docs/decisions/0009-indexeddb-drafts.md`
- Create: `docs/decisions/0010-defer-granular-events.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: module and domain definitions from `docs/product.md` sections 7–10.
- Produces: canonical vocabulary and ten accepted decisions that later tickets must not silently weaken.

- [ ] **Step 1: Ergänze einen fehlschlagenden ADR-Vollständigkeitstest**

Append to `scripts/check-docs.sh`:

```bash
for number in $(seq 1 10); do
  printf -v adr_number '%04d' "$number"
  compgen -G "docs/decisions/${adr_number}-*.md" >/dev/null || {
    echo "missing ADR $adr_number" >&2
    exit 1
  }
done

for adr in docs/decisions/[0-9][0-9][0-9][0-9]-*.md; do
  grep -Fq '**Status:** Accepted' "$adr"
  grep -Fq '## Context' "$adr"
  grep -Fq '## Decision' "$adr"
  grep -Fq '## Consequences' "$adr"
done
```

- [ ] **Step 2: Führe den ADR-Check aus**

Run: `bash scripts/check-docs.sh`
Expected: exit `1` with `missing ADR 01` or the first still-missing global document.

- [ ] **Step 3: Schreibe das kanonische Vokabular**

`CONTEXT.md` must define these exact canonical terms and reject synonyms in code:

```markdown
# Domain Context

| Begriff | Bedeutung | Nicht verwenden |
|---|---|---|
| Klasse | Gruppe von Schülerprofilen | Kurs, Gruppe, Classroom |
| Schülerprofil | für den Sitzplan relevante Personendarstellung | Student-Record, User |
| Raumvorlage | Geometrie und Möblierung ohne Schülerzuordnung | Layout, Template allein |
| Sitzplatz | adressierbare Position an einem Tisch | Chair, Slot ohne Kontext |
| Sitzplan | Verbindung von Klasse, Raumvorlage und Zuordnung | Board, Canvas |
| Canvas-Dokument | versionierter räumlicher Editorzustand | Blob, Payload |
| Revision | fortlaufende Nummer des aktuellen Serverstands | Version |
| Planversion | unveränderlicher benannter Snapshot | Revision |
| Sitzregel | harte Bedingung oder gewichteter Wunsch | Constraint ohne Präzisierung |
| Planvorschlag | noch nicht übernommene Änderung | Ergebnis, Mutation |
```

Add invariants: one student at most once per plan, assignments reference existing seats, hard rules are never violated, restore creates a revision, and AI output is never applied before validation and confirmation.

- [ ] **Step 4: Schreibe Architektur und ADR-Reihe**

Every ADR uses:

```markdown
# ADR-0001: Next.js als Full-Stack-Anwendung

**Status:** Accepted
**Date:** 2026-07-22

## Context
## Decision
## Consequences
## Superseding this decision
```

Use these exact decisions:

| ADR | Decision | Required consequence |
|---|---|---|
| 0001 | One Next.js App Router application | Domain services stay framework-independent; no separate backend in MVP |
| 0002 | React-Konva owns interactive 2D rendering | Persist domain documents, never serialized Konva nodes |
| 0003 | Relational metadata plus Zod-versioned JSONB canvas documents | Schema version and migrations are mandatory before contract changes |
| 0004 | Debounced autosave plus immutable named snapshots | Autosave protects work; snapshots protect meaningful states |
| 0005 | LLMs emit validated domain commands only | No direct database, service, or canvas mutation from model output |
| 0006 | Deterministic optimizer owns placement validity | LLM interprets and explains; optimizer enforces rules and seed reproducibility |
| 0007 | OpenAI-compatible BYOK plus Ollama | Provider adapter remains replaceable and manual work works without AI |
| 0008 | Single-user prototype uses test data | Multi-user and production-data readiness remain post-MVP milestones |
| 0009 | IndexedDB stores recoverable local drafts | PostgreSQL remains server truth; conflict resolution is explicit |
| 0010 | Granular persistence and event history are deferred | M9/M10 require a new ADR proving snapshots insufficient |

`docs/architecture.md` must show the dependency direction:

```text
UI / React-Konva
       ↓
Application services
       ↓
Domain contracts + pure logic
       ↑
Infrastructure adapters (PostgreSQL, files, AI providers, IndexedDB)
```

It must also list the ten modules from `docs/product.md` without adding an eleventh product domain.

- [ ] **Step 5: Run the ADR checks**

Run:

```bash
bash scripts/check-docs.sh
rg -n 'Canvas-Dokument|Planversion|Planvorschlag' CONTEXT.md docs/architecture.md docs/decisions
```

Expected: the ADR portion passes; the global check may still fail on files scheduled in later tasks.

- [ ] **Step 6: Commit the domain decisions**

```bash
git add CONTEXT.md docs/architecture.md docs/decisions CHANGELOG.md scripts/check-docs.sh
git commit -m "docs: record domain architecture decisions"
```

## Task 3: Matt-Pocock-Projektkonfiguration anlegen

**Files:**
- Create: `docs/agents/issue-tracker.md`
- Create: `docs/agents/triage-labels.md`
- Create: `docs/agents/domain.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: GitHub repository identity and `CONTEXT.md`/ADR layout.
- Produces: configuration read by `/grill-with-docs`, `/to-spec`, `/to-tickets`, `/triage` and `/implement`.

- [ ] **Step 1: Schreibe die drei Konfigurationsdateien**

`docs/agents/issue-tracker.md`:

```markdown
# Issue tracker

Issues live in GitHub repository `arn0ld87/abschlussprojekt_beziehung`.

- Read with `gh issue view "$ISSUE_NUMBER" --comments` after resolving `ISSUE_NUMBER` from the selected frontier issue.
- Create one parent issue per approved spec or milestone.
- Create implementation work through `/to-tickets` as vertical slices.
- Every implementation issue lists native blockers when available and a textual `Blocked by` section.
- Pull requests are not an issue intake surface.
- Concrete work belongs in issues, never in ROADMAP or STATUS prose.
```

`docs/agents/triage-labels.md`:

```markdown
# Triage labels

| Role | GitHub label |
|---|---|
| untriaged | `needs-triage` |
| waiting for information | `needs-info` |
| executable by an agent | `ready-for-agent` |
| waiting for a person | `ready-for-human` |
| intentionally rejected | `wontfix` |

Do not invent aliases. If the labels do not yet exist, create exactly these five before triage begins.
```

`docs/agents/domain.md`:

```markdown
# Domain documentation

Sitzplan uses a single-context layout.

1. Read root `CONTEXT.md` for canonical terms and invariants.
2. Read `docs/decisions/README.md` and relevant accepted ADRs before design changes.
3. Update `CONTEXT.md` only when a domain term or invariant changes.
4. Add an ADR for durable architectural decisions; never rewrite accepted history silently.
5. `docs/product.md` defines approved product scope but does not replace executable issues.
```

- [ ] **Step 2: Verify exact Matt-Pocock vocabulary**

Run:

```bash
for label in needs-triage needs-info ready-for-agent ready-for-human wontfix; do
  grep -Fq "$label" docs/agents/triage-labels.md
done
grep -Fq 'single-context' docs/agents/domain.md
grep -Fq 'arn0ld87/abschlussprojekt_beziehung' docs/agents/issue-tracker.md
```

Expected: exit `0`.

- [ ] **Step 3: Commit the plugin configuration**

```bash
git add docs/agents CHANGELOG.md
git commit -m "docs: configure matt pocock engineering skills"
```

## Task 4: Gemeinsame Agenten- und Beitragsregeln definieren

**Files:**
- Create: `AGENTS.md`
- Create: `CLAUDE.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `docs/runbooks/release.md`
- Create: `docs/runbooks/backup-restore.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: hierarchy, domain vocabulary, accepted ADRs and Matt-Pocock configuration.
- Produces: mandatory development gates for all later application tickets.

- [ ] **Step 1: Schreibe `AGENTS.md` als gemeinsame Policy**

It must contain these rule groups with imperative language:

```markdown
# AGENTS.md

## Read order
README.md → docs/STATUS.md → ROADMAP.md → GitHub issue → CONTEXT.md → relevant ADRs.

## Mandatory workflow
1. Never work directly on `main`.
2. Use one worktree, one issue, one vertical slice, one atomic commit and one pull request.
3. Use RED → GREEN → Refactor for behavior changes.
4. Run scope-appropriate tests and the repository gate before publication.
5. Update only the matching documentation source in the same slice.
6. Never weaken assertions, add broad retries, or skip tests to make CI green.
7. Never place secrets, real student data, provider keys or local host configuration in the repository.

## Architecture hard stops
- Persist Zod-versioned domain documents, not Konva node serialization.
- AI output cannot directly mutate canvas, services or database.
- Hard seating rules cannot be violated.
- Restore creates a new revision.
- M9/M10 require a new accepted ADR.

## Agent skills
### Issue tracker
GitHub Issues; see `docs/agents/issue-tracker.md`.
### Triage labels
Canonical five-role mapping; see `docs/agents/triage-labels.md`.
### Domain docs
Single-context layout; see `docs/agents/domain.md`.
```

Also include exact future verification commands without pretending they exist before M0 application scaffolding:

```bash
bash scripts/check-docs.sh
bun run lint
bun run typecheck
bun run test
bun run test:e2e
```

Mark the last four as applicable only after their scripts are introduced by the responsible milestone issue.

- [ ] **Step 2: Schreibe `CLAUDE.md` als Orchestrierungsregel**

Start with `@AGENTS.md`. Define:

- `/sitzplan-next-task` handles exactly one ready issue.
- lead reads the full issue and blockers before dispatch.
- writing workers use worktree isolation and do not push.
- reviewer is read-only and receives the fixed base and issue commit.
- only `APPROVE` allows publication.
- maximum two writers only when files, contracts, migrations and causes are independent.
- MiniMax-M3 is the primary implementation model.
- architecture, security, migrations, ambiguous specs and cross-module contracts remain with the lead.
- worker summaries are not evidence; the lead runs checks.

Add the `## Agent skills` block required by Matt Pocock and link the three files created in Task 3.

- [ ] **Step 3: Schreibe contribution, security and runbook documents**

`CONTRIBUTING.md` must define branch naming `type/issue-short-description`, Conventional Commit subjects, TDD, atomic PRs, required PR fields, and the no-`--no-verify` rule.

`SECURITY.md` must state:

- prototype/test-data boundary;
- no real student data while repository is public;
- no secrets in git, logs, fixtures or prompts;
- report vulnerabilities privately to repository owner;
- provider keys enter through runtime configuration only;
- production-data readiness is M12, not an implied current property.

`docs/runbooks/release.md` must define release order: clean tree → dependencies locked → scoped tests → full tests → docs check → backup/restore smoke → changelog → version tag.

`docs/runbooks/backup-restore.md` must define the future contract without claiming implementation: backup includes PostgreSQL dump, uploads volume, application version and schema version; restore uses an empty target, validates counts and opens a known plan. Label the runbook `Target procedure for M6/M7; not implemented during M0`.

- [ ] **Step 4: Verify policies**

Run:

```bash
grep -Fq '@AGENTS.md' CLAUDE.md
grep -Fq 'Never work directly on `main`' AGENTS.md
grep -Fq 'ready-for-agent' CLAUDE.md
grep -Fq 'no real student data' SECURITY.md
grep -Fq 'Target procedure for M6/M7' docs/runbooks/backup-restore.md
```

Expected: exit `0`.

- [ ] **Step 5: Commit the governance rules**

```bash
git add AGENTS.md CLAUDE.md CONTRIBUTING.md SECURITY.md docs/runbooks CHANGELOG.md
git commit -m "docs: define agent and contribution workflow"
```

## Task 5: MiniMax-M3-Spezialagenten anlegen

**Files:**
- Create: `.claude/agents/sitzplan-lead-m3.md`
- Create: `.claude/agents/sitzplan-frontend-m3.md`
- Create: `.claude/agents/sitzplan-domain-m3.md`
- Create: `.claude/agents/sitzplan-ai-m3.md`
- Create: `.claude/agents/sitzplan-test-m3.md`
- Create: `.claude/agents/sitzplan-doc-m3.md`
- Create: `.claude/agents/sitzplan-reviewer-m3.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, relevant ADRs and one GitHub issue.
- Produces: seven narrow roles with explicit write boundaries and measurable completion output.

- [ ] **Step 1: Schreibe ein gemeinsames Agenten-Frontmatter-Muster**

Every agent file starts with valid Claude Code frontmatter. Use these exact names and descriptions:

| Name | Description |
|---|---|
| `sitzplan-lead-m3` | Coordinates architecture, contracts, issue selection, integration and final verification. |
| `sitzplan-frontend-m3` | Implements React, Konva, visual design, accessibility and frontend behavior tests. |
| `sitzplan-domain-m3` | Implements domain contracts, persistence, migrations, versioning and deterministic optimization. |
| `sitzplan-ai-m3` | Implements provider adapters, structured AI commands, prompt contracts and AI boundary tests. |
| `sitzplan-test-m3` | Implements behavior tests, fixtures, property tests, Playwright flows and reproducibility tooling. |
| `sitzplan-doc-m3` | Maintains active documentation sources, ADR drafts, changelog entries and runbooks. |
| `sitzplan-reviewer-m3` | Performs a read-only review of a fixed commit against issue, spec, architecture and test evidence. |

For example, the lead frontmatter is:

```yaml
---
name: sitzplan-lead-m3
description: Coordinates architecture, contracts, issue selection, integration and final verification.
model: MiniMax-M3
---
```

Every writing agent body must require this final report shape:

```markdown
## Result
- Issue:
- Commit:
- Files changed:
- Tests run:
- Gate result:
- Risks or follow-up:
```

- [ ] **Step 2: Implement the seven role boundaries**

Use these exact scopes:

| Agent | May change | Must escalate |
|---|---|---|
| lead | plans, contracts, orchestration and cross-module integration | unresolved product decision to user |
| frontend | React, Konva, styling, accessibility and frontend tests | domain contract or persistence change |
| domain | pure domain logic, Zod contracts, Drizzle persistence, migrations, optimizer | UI redesign or provider semantics |
| ai | provider adapters, structured commands, prompt contracts and AI tests | direct mutations or optimizer validity |
| test | tests, fixtures, test helpers and reproducibility tooling | production behavior needed only to make a test pass |
| doc | README, STATUS, ROADMAP, CHANGELOG, ADR drafts and runbooks | silently changing accepted behavior |
| reviewer | no writes; inspect fixed diff, issue, tests and docs | any unresolved major or critical finding |

The reviewer ends with exactly one verdict line:

```text
VERDICT: APPROVE
```

or:

```text
VERDICT: REQUEST_CHANGES
```

and lists file/line evidence for every requested change.

- [ ] **Step 3: Validate agent registration and reviewer immutability**

Run:

```bash
test "$(find .claude/agents -maxdepth 1 -name 'sitzplan-*-m3.md' | wc -l | tr -d ' ')" = 7
for file in .claude/agents/sitzplan-*-m3.md; do
  grep -Fq 'model: MiniMax-M3' "$file"
done
grep -Fq 'no writes' .claude/agents/sitzplan-reviewer-m3.md
grep -Fq 'VERDICT: APPROVE' .claude/agents/sitzplan-reviewer-m3.md
```

Expected: exit `0`.

- [ ] **Step 4: Commit the agents**

```bash
git add .claude/agents CHANGELOG.md
git commit -m "chore: add minimax m3 development agents"
```

## Task 6: Next-task-Orchestrierung und Master-Prompt schreiben

**Files:**
- Create: `.claude/commands/sitzplan-next-task.md`
- Create: `docs/runbooks/next-task.md`
- Create: `docs/prompts/minimax-m3-master.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: one `ready-for-agent` issue, blocker state and seven registered agents.
- Produces: repeatable single-issue workflow and copy-ready bootstrap prompt.

- [ ] **Step 1: Schreibe `/sitzplan-next-task` als deterministischen Ablauf**

The command must require this order:

1. Read `AGENTS.md`, `CLAUDE.md`, `docs/STATUS.md`, `ROADMAP.md`, `CONTEXT.md` and relevant ADRs.
2. List open `ready-for-agent` issues and ignore issues with unresolved blockers.
3. Select the highest-priority frontier issue; never select more than one.
4. Restate scope, acceptance criteria, files likely affected, tests and out-of-scope.
5. Stop and request clarification if the issue is ambiguous.
6. Create an issue-specific worktree and branch.
7. Dispatch exactly one matching writer agent.
8. Run the scope-specific tests and repository gate in the lead context.
9. Dispatch `sitzplan-reviewer-m3` read-only against fixed base and issue commit.
10. On `REQUEST_CHANGES`, return to the same writer once, then re-run tests and review.
11. On `APPROVE`, prepare a PR description; do not merge automatically.
12. Report commit, diff summary, tests, gate, review and remaining risks.

`docs/runbooks/next-task.md` repeats the operational contract for runtimes that do not support slash commands.

- [ ] **Step 2: Schreibe den copy-ready MiniMax-M3-Master-Prompt**

`docs/prompts/minimax-m3-master.md` must contain this complete prompt:

```markdown
# MiniMax-M3 Master Prompt — Sitzplan

Du bist der Lead-Entwickler für `arn0ld87/abschlussprojekt_beziehung`.

## Mission
Entwickle Sitzplan milestoneweise zu einer grafischen, selbst gehosteten Single-User-PWA. Arbeite niemals den gesamten MVP in einem Lauf ab. Nimm genau ein freigegebenes GitHub Issue aus der aktuellen Frontier und liefere einen testbaren vertikalen Slice.

## Verbindliche Quellen
Lies vor jeder Arbeit in dieser Reihenfolge:
1. `README.md`
2. `docs/STATUS.md`
3. `ROADMAP.md`
4. das vollständige GitHub Issue einschließlich Kommentare und Blocker
5. `CONTEXT.md`
6. relevante Dateien unter `docs/decisions/`
7. `AGENTS.md` und `CLAUDE.md`

Bei Widersprüchen gilt nicht deine Vermutung. Stoppe und dokumentiere die Drift.

## Matt-Pocock-Workflow
- Nutze `/grill-with-docs`, wenn ein Produktbereich noch unklar ist.
- Nutze `/to-spec`, wenn die Unterhaltung eine freigegebene Spezifikation enthält.
- Nutze `/to-tickets`, um Parent-Issues in vertikale Slices mit Blockern zu zerlegen.
- Nutze `/implement` und `/tdd` für genau einen freigegebenen Slice.
- Nutze `/code-review` vor jedem Commitabschluss.

## Harte Architekturregeln
- Persistiere Zod-versionierte Domänendokumente, niemals serialisierte Konva-Knoten.
- LLM-Ausgaben sind untrusted input und dürfen nur validierte Domänenkommandos vorschlagen.
- Kein Modell darf Canvas, Service oder Datenbank direkt mutieren.
- Harte Sitzregeln werden nie verletzt.
- Der Optimierer ist deterministisch; gleicher Input plus gleicher Seed ergibt dasselbe Ergebnis.
- Restore erzeugt eine neue Revision und verändert keinen Snapshot.
- PostgreSQL ist Serverwahrheit; IndexedDB ist ausschließlich recoverable draft.
- M9 oder M10 beginnen erst nach einem neuen akzeptierten ADR.

## Arbeitsweise
1. Prüfe Blocker und Akzeptanzkriterien.
2. Formuliere eine kurze Slice-Spec und benenne Out-of-Scope.
3. Arbeite in einem eigenen Worktree und niemals direkt auf `main`.
4. Schreibe zuerst einen fehlschlagenden Verhaltenstest.
5. Implementiere nur genug für GREEN.
6. Refactore bei grünen Tests.
7. Führe gezielte Tests früh und das vollständige Scope-Gate am Ende aus.
8. Aktualisiere passende Dokumentation und CHANGELOG im selben Slice.
9. Erzeuge genau einen atomaren lokalen Commit.
10. Lass den festen Commit von `sitzplan-reviewer-m3` read-only prüfen.
11. Push und PR erst nach `VERDICT: APPROVE`; niemals automatisch mergen.

## Delegation
Delegiere nur enge, messbare Aufgaben. Maximal zwei Writer dürfen parallel arbeiten, und nur wenn sie keine gleichen Dateien, Contracts, Migrationen, Ursachen oder Blocker teilen. Architektur, Sicherheit, Migrationen, ambige Anforderungen und Cross-Module-Verträge bleiben beim Lead.

## Abschlussformat
- Issue und Scope
- Commit und geänderte Dateien
- RED-Nachweis
- GREEN-Nachweis
- vollständiges Scope-Gate
- Reviewer-Verdict
- Risiken und Folge-Issues

Beginne jetzt nicht mit Implementierung. Prüfe zuerst Repositoryzustand und Frontier und nenne genau das eine Issue, das als Nächstes ausführbar ist.
```

- [ ] **Step 3: Verify command and prompt hard stops**

Run:

```bash
grep -Fq 'never select more than one' .claude/commands/sitzplan-next-task.md
grep -Fq 'VERDICT: APPROVE' .claude/commands/sitzplan-next-task.md
grep -Fq 'Beginne jetzt nicht mit Implementierung' docs/prompts/minimax-m3-master.md
grep -Fq 'niemals serialisierte Konva-Knoten' docs/prompts/minimax-m3-master.md
```

Expected: exit `0`.

- [ ] **Step 4: Commit orchestration and prompt**

```bash
git add .claude/commands docs/runbooks/next-task.md docs/prompts CHANGELOG.md
git commit -m "chore: add next-task orchestration and master prompt"
```

## Task 7: GitHub-Arbeitsvorlagen und Dokumentations-CI anlegen

**Files:**
- Create: `.github/ISSUE_TEMPLATE/feature.yml`
- Create: `.github/ISSUE_TEMPLATE/bug.yml`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `.github/workflows/docs.yml`
- Modify: `scripts/check-docs.sh`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: governance rules and docs check.
- Produces: structured issue intake, reviewable PR evidence and required bootstrap CI job `docs`.

- [ ] **Step 1: Schreibe Issue-Formulare mit validierbaren Pflichtfeldern**

`feature.yml` fields: problem, user-visible outcome, acceptance criteria, blocked-by, out-of-scope, test seam, and checklist confirming test data only and no secrets. Title prefix is `[Feature]: `.

`bug.yml` fields: observed behavior, expected behavior, exact reproduction, environment, logs with redaction confirmation, regression test seam, and blocked-by. Title prefix is `[Bug]: `.

Both forms set no nonexistent custom labels during bootstrap.

- [ ] **Step 2: Schreibe die PR-Vorlage**

Use this exact checklist:

```markdown
## Issue

Closes #

## Scope

## Out of scope

## Behavior

## Evidence

- [ ] RED test observed before implementation
- [ ] Targeted tests pass
- [ ] Scope gate passes
- [ ] Documentation source updated where required
- [ ] No secrets or real student data added
- [ ] Migration and rollback documented, or not applicable with reason

## Reviewer

- [ ] Fixed commit reviewed
- [ ] `VERDICT: APPROVE`
```

- [ ] **Step 3: Schreibe den Docs-Workflow**

`.github/workflows/docs.yml`:

```yaml
name: docs

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          persist-credentials: false
      - name: Check documentation contracts
        run: bash scripts/check-docs.sh
```

Do not mark this required in repository settings until one successful run proves the job name and workflow.

- [ ] **Step 4: Run local YAML and docs checks**

Run:

```bash
bash scripts/check-docs.sh
ruby -e 'require "yaml"; Dir[".github/**/*.yml"].each { |f| YAML.load_file(f); puts "yaml-ok: #{f}" }'
```

Expected: `docs-check: ok` and one `yaml-ok` line per issue form/workflow.

- [ ] **Step 5: Commit the GitHub workflow**

```bash
git add .github scripts/check-docs.sh CHANGELOG.md
git commit -m "ci: add project intake and docs gate"
```

## Task 8: Milestone-Parent-Issues veröffentlichen

**Files:**
- Modify: `docs/STATUS.md`
- Modify: `CHANGELOG.md`

**External state:**
- Create: thirteen GitHub parent issues in `arn0ld87/abschlussprojekt_beziehung`.

**Interfaces:**
- Consumes: `ROADMAP.md`, `docs/product.md`, Matt-Pocock tracker rules.
- Produces: executable milestone frontier; detailed implementation tickets are created later through `/to-tickets`.

- [ ] **Step 1: Erzeuge Parent-Issues in Abhängigkeitsreihenfolge**

Create these exact titles and blocker edges:

| Milestone | Parent issue title | Blocked by |
|---|---|---|
| M0 | `[M0] Foundation: Repository und Agentenworkflow` | None |
| M1 | `[M1] Klassen: Auth, Klassen und Schülerprofile` | M0 |
| M2 | `[M2] Raumeditor: Maße, Möbel und Sitzplätze` | M0 |
| M3 | `[M3] Persistente Pläne: Autosave, Versionen und Restore` | M1, M2 |
| M4 | `[M4] Optimierer: Regeln, Konflikte und reproduzierbare Vorschläge` | M3 |
| M5 | `[M5] KI-Assistent: BYOK, Chat und validierte Commands` | M4 |
| M6 | `[M6] Ausgabe und PWA: Entwürfe, PDF, PNG und Import/Export` | M3 |
| M7 | `[M7] MVP-Härtung: E2E, Accessibility, Backup und Release` | M4, M5, M6 |
| M8 | `[M8] Erweiterter Raumeditor: Tischgruppen und freie Sitzplätze` | M7 |
| M9 | `[M9] Decision Gate: Granulareres Persistenzmodell` | M7 |
| M10 | `[M10] Decision Gate: Ereignisprotokoll und Zeitreise` | M7, M9 |
| M11 | `[M11] Mehrbenutzerbetrieb: Rollen und gemeinsame Vorlagen` | M7 |
| M12 | `[M12] Produktivfreigabe für echte Schuldaten` | M11 |

Every issue body contains these exact sections:

1. `## Outcome` followed by the matching `Ziel` paragraph copied unchanged from `ROADMAP.md`.
2. `## Release criteria` with four checkboxes: every child slice merged; milestone acceptance path green; STATUS and CHANGELOG synchronized; no unresolved critical or major review finding.
3. `## Blocked by`. M0 contains `None — can start immediately`. Every later issue contains the actual GitHub URLs returned when the blocking parent issues from the table were created.
4. `## Ticketing` containing: `Run /grill-with-docs if the milestone is ambiguous, then /to-spec and /to-tickets. Do not implement this parent issue directly.`

Do not close or assign the parent issues during creation. Apply `ready-for-agent` only to child slices, never to the milestone parent.

- [ ] **Step 2: Verify the milestone frontier**

In Codex Work Mode, query the repository's open issues through the connected GitHub app and verify titles and blocker links. In a local Claude Code checkout with authenticated GitHub CLI, run:

```bash
gh issue list --repo arn0ld87/abschlussprojekt_beziehung --state open --limit 100
```

Expected: thirteen milestone parent issues; only M0 has no blocker.

- [ ] **Step 3: Synchronize STATUS and CHANGELOG**

Update `docs/STATUS.md` with the actual GitHub issue numbers and state that M0 is the only current frontier. Add milestone parent issues under `CHANGELOG.md` → `Unreleased` → `Added`.

- [ ] **Step 4: Run final bootstrap verification**

Run:

```bash
bash scripts/check-docs.sh
git diff --check
git status --short
```

Expected: docs check and diff check exit `0`; status lists only the intended STATUS/CHANGELOG update before commit.

- [ ] **Step 5: Commit tracker synchronization**

```bash
git add docs/STATUS.md CHANGELOG.md
git commit -m "docs: publish milestone issue frontier"
```

## Task 9: Bootstrap-Abschlussreview und Pull Request

**Files:**
- Modify only when review finds an evidenced defect in planned bootstrap files.

**Interfaces:**
- Consumes: fixed commit range from the first bootstrap commit through Task 8.
- Produces: independent standards/spec verdict and publication-ready PR.

- [ ] **Step 1: Run complete local bootstrap gate**

Run:

```bash
bash scripts/check-docs.sh
git diff --check main...HEAD
git log --oneline --decorate main..HEAD
```

Expected: `docs-check: ok`, no whitespace errors, and one atomic commit per completed task.

- [ ] **Step 2: Dispatch read-only review**

Give `sitzplan-reviewer-m3`:

- base commit before Task 1;
- fixed HEAD commit after Task 8;
- `docs/product.md` and this plan;
- instruction to check source hierarchy, Matt-Pocock compatibility, ADR consistency, placeholder absence, agent permissions, CI safety and issue blocker graph.

Expected verdict: `VERDICT: APPROVE`. On `REQUEST_CHANGES`, fix only evidenced findings, rerun Step 1 and repeat review.

- [ ] **Step 3: Prepare pull request without auto-merge**

PR title:

```text
chore: bootstrap Sitzplan project workflow
```

PR body must summarize Scope, Out of scope, Evidence, milestone issue frontier, reviewer verdict and the fact that no application code is included.

- [ ] **Step 4: Verify remote CI before merge**

Expected: GitHub job `docs` passes. Do not configure it as required until this first successful run establishes the real check name.

- [ ] **Step 5: Hand off the next executable action**

After merge, M0 remains the only frontier until its application-foundation child tickets are created. Start a new session with the content of `docs/prompts/minimax-m3-master.md`; it must identify the M0 parent and run `/to-tickets` rather than implement the parent directly.
