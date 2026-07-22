# Sitzplan: nächsten vertikalen Slice ausführen

Führe einen reproduzierbaren Workflow für **genau ein** GitHub-Issue aus. Dieses Command übernimmt keine Implementierung mehrerer Tickets und merged niemals automatisch.

## Read order

README.md → docs/STATUS.md → ROADMAP.md → GitHub issue → CONTEXT.md → relevant ADRs (canonical order, see `AGENTS.md`).

## Vorbedingung und Lese-Reihenfolge

1. Lies `AGENTS.md`, `CLAUDE.md`, `docs/STATUS.md`, `ROADMAP.md`, `CONTEXT.md` und die für die Frontier relevanten ADRs.
2. Liste alle offenen Issues mit `ready-for-agent`.
3. Lies anschließend jedes gelistete Issue vollständig, einschließlich Kommentare, verlinkter Blocker und Akzeptanzkriterien. Filtere jedes Issue mit einem ungelösten Blocker oder ohne überprüfbare Akzeptanzkriterien heraus.

## Auswahl und Arbeitsauftrag

4. Wähle aus der verbleibenden Frontier genau das Issue des frühesten noch offenen ROADMAP-Meilensteins; bei mehreren Issues desselben Meilensteins wähle die niedrigste GitHub-Issue-Nummer. Bei fehlender oder widersprüchlicher Meilensteinzuordnung stoppe und bitte um Klärung. **never select more than one**.
5. Wiederhole vor dem Schreiben: Scope, Akzeptanzkriterien, voraussichtlich betroffene Dateien, gezielte Tests, Repository-Gates und Out-of-Scope.
6. Stoppe und bitte um Klärung, wenn Issue, Architekturentscheidung, Akzeptanzkriterien oder Blocker mehrdeutig sind. Keine Vermutungen als Entscheidung ausgeben.
7. Erstelle für dieses eine Issue einen eigenen Branch und ein issue-spezifisches Worktree. Arbeite niemals direkt auf `main`.
8. Ordne dem Issue exakt einen passenden schreibenden Agenten zu. Ein `/sitzplan-next-task`-Lauf hat genau ein Issue, einen Writer, ein Worktree und einen atomaren Commit. Zwei Writer sind nur über zwei bereits getrennte, nachweislich unabhängige Issue-Läufe erlaubt; jeder Lauf braucht ein eigenes Worktree, einen eigenen Commit und einen eigenen Pull Request.

## Verifikation und Review

9. Führe im Lead-Kontext die scope-spezifischen Tests und jeden anwendbaren Repository-Gate aus. Sie müssen für den festen Issue-Commit mit Exit-Code `0` enden.
10. Lasse `sitzplan-reviewer-m3` den festen Base-Commit und den festen Issue-Commit read-only prüfen. Der Review endet mit `VERDICT: APPROVE` oder `VERDICT: REQUEST_CHANGES`.
11. Bei `REQUEST_CHANGES` darf genau einmal derselbe Writer nachbessern und muss den bestehenden einzigen Issue-Commit amendieren oder ersetzen, sodass auf dem Branch weiterhin genau ein atomarer Issue-Commit liegt. Danach: Tests und Gates erneut gegen den neuen festen SHA ausführen und diesen Commit erneut read-only reviewen. Bei erneutem Änderungswunsch stoppen und die offenen Punkte berichten.
12. Bei `VERDICT: APPROVE` und grünen, anwendbaren Tests/Gates: bereite eine Pull-Request-Beschreibung vor. Push und PR sind erst dann zulässig; niemals automatisch mergen.

## Abschlussbericht

Berichte Issue, festen Commit, Diff-Zusammenfassung, ausgeführte Tests, Gate-Ergebnisse, Reviewer-Verdict und verbleibende Risiken oder Folge-Issues. Worker-Zusammenfassungen sind nur Navigation, kein Nachweis.
