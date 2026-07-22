# src/services

Application Services — orchestrieren Anwendungsfälle gegen die Domäne.

## Abhängigkeitsrichtung

`services` darf **nur** aus `src/domain` importieren. Niemals aus
`src/infrastructure` oder direkt aus UI/Route-Handlern. UI ruft Services über
Route-Handler auf, niemals direkt.

## Status M0

Leerer Platzhalter. Echte Service-Implementierungen folgen in M5 — siehe
Issue #21.
