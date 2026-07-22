# Runbook: nächstes Sitzplan-Issue umsetzen

Dieses Runbook ist die Laufzeit-Alternative zu `/sitzplan-next-task`. Es führt einen einzigen, testbaren vertikalen Slice bis zu einer vorbereiteten Pull Request, aber niemals bis zum automatischen Merge.

## Read order

README.md → docs/STATUS.md → ROADMAP.md → GitHub issue → CONTEXT.md → relevant ADRs (canonical order, see `AGENTS.md`).

## Eingangskontrolle

1. Lies `AGENTS.md`, `CLAUDE.md`, `docs/STATUS.md`, `ROADMAP.md`, `CONTEXT.md` und die relevanten ADRs.
2. Liste zuerst alle offenen Issues mit `ready-for-agent`.
3. Lies danach jedes gelistete Issue einschließlich Kommentare, Akzeptanzkriterien und Blocker vollständig und entferne jedes Issue mit offenem Blocker oder unklaren Akzeptanzkriterien aus der Auswahl.
4. Wähle genau ein Frontier-Issue: zuerst aus dem frühesten noch offenen ROADMAP-Meilenstein und bei mehreren Issues desselben Meilensteins die niedrigste GitHub-Issue-Nummer. Bei fehlender oder widersprüchlicher Meilensteinzuordnung stoppen und Klärung einholen.

## Ein-Writer-Vertrag

Ein Lauf verarbeitet exakt ein Issue, einen Writer, ein Worktree und einen atomaren lokalen Commit. Der Lead nennt vorab Scope, Akzeptanzkriterien, voraussichtlich betroffene Dateien, Tests, Gates und Out-of-Scope.

Maximal zwei Writer dürfen nur über zwei bereits getrennte, unabhängige Issue-Läufe parallel arbeiten. Diese Läufe brauchen eigene Worktrees, Commits und Pull Requests und dürfen weder Dateien, Verträge, Migrationen, Ursachen noch Blocker teilen. Innerhalb eines einzelnen `/sitzplan-next-task`-Laufs gibt es niemals zwei Writer.

## Durchführung

1. Erstelle Branch und issue-spezifisches Worktree; niemals direkt auf `main` arbeiten.
2. Wähle genau einen passenden Schreibagenten aus den sieben registrierten MiniMax-M3-Rollen und übergebe ihm den festgehaltenen Scope.
3. Der Writer arbeitet RED → GREEN → Refactor, aktualisiert die passende Dokumentation und erzeugt genau einen atomaren lokalen Commit.
4. Der Lead prüft den festen Commit selbst: Diff, scope-spezifische Tests und alle anwendbaren Repository-Gates. Jeder relevante Check muss Exit-Code `0` liefern.
5. Der Lead beauftragt `sitzplan-reviewer-m3` mit einem read-only Review gegen den festen Base-Commit und den festen Issue-Commit.

## Fix-Loop und Veröffentlichung

Bei `VERDICT: REQUEST_CHANGES` kehrt der Auftrag genau einmal zum selben Writer zurück. Dieser amendiert oder ersetzt den bestehenden einzigen Issue-Commit, sodass auf dem Branch weiterhin genau ein atomarer Issue-Commit liegt. Danach werden Tests, Gates und ein neuer read-only Review gegen den neuen festen SHA wiederholt. Bei einem weiteren Änderungswunsch endet der Lauf mit einem klaren Befundbericht.

Bei `VERDICT: APPROVE` **und** grünen scope-spezifischen Tests/Gates bereitet der Lead die PR-Beschreibung vor. Das Verdict ersetzt keine Tests oder Gates. Push und Pull Request sind erst nach dieser Prüfung zulässig; ein Merge erfolgt nie automatisch.

## Abschlussprotokoll

Dokumentiere Issue und Scope, Commit und Diff-Zusammenfassung, RED- und GREEN-Nachweis, vollständige Gate-Ausgabe, Reviewer-Verdict, Risiken und Folge-Issues. Worker-Berichte sind keine Verifikationsbelege.
