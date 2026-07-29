---
description: Bearbeitet genau das nächste freigegebene Sitzplan-Issue als isolierten vertikalen Slice
---

# Sitzplan: nächstes Issue bearbeiten

Führe den Ablauf aus `docs/runbooks/next-task.md` vollständig und strikt aus.

## Verbindliche Regeln

1. Lies zuerst `AGENTS.md`.
2. Wähle genau ein offenes GitHub-Issue mit dem Label `ready-for-agent`.
3. Berücksichtige Kommentare, Blocker, Akzeptanzkriterien, ROADMAP und relevante ADRs.
4. Arbeite ausschließlich in einem neuen issue-spezifischen Git-Worktree.
5. Arbeite niemals direkt auf `main`.
6. Verwende genau einen schreibenden Subagenten.
7. Prüfe den festen Issue-Commit anschließend mit einem separaten read-only Reviewer-Subagenten.
8. Führe alle anwendbaren Tests und Repository-Gates aus.
9. Bei `REQUEST_CHANGES` darf genau eine Nachbesserung durch denselben Writer erfolgen.
10. Push und Pull Request sind nur bei grünen Gates und `VERDICT: APPROVE` zulässig.
11. Merge niemals automatisch.
12. Berichte abschließend:
    - Issue und Scope
    - Branch und Worktree
    - festen Commit-SHA
    - Diff-Zusammenfassung
    - ausgeführte Tests
    - Gate-Ergebnisse
    - Reviewer-Verdict
    - verbleibende Risiken
