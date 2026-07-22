# ADR-0006: Deterministischer Optimierer für gültige Platzierungen

**Status:** Accepted<br>
**Date:** 2026-07-22

## Context

Platzierungen müssen existierende Sitzplätze nutzen, Schülerprofile höchstens einmal zuordnen und harte Sitzregeln einhalten. Ein Sprachmodell kann diese Invarianten nicht reproduzierbar garantieren.

## Decision

**Deterministic optimizer owns placement validity.** Der Optimierer arbeitet ohne LLM-Abhängigkeit, wertet gewichtete Wünsche transparent aus und liefert bei unlösbaren Regeln eine verständliche Konfliktmenge.

## Consequences

**LLM interprets and explains; optimizer enforces rules and seed reproducibility.** Gleiche Eingaben und derselbe Seed erzeugen dasselbe Ergebnis. KI darf Regeln interpretieren und Planvorschläge erklären, aber keine ungültige Platzierung legitimieren.

## Superseding this decision

Ein neues ADR muss mindestens dieselben Invarianten, Reproduzierbarkeit, Konflikterklärung und automatisierten Nachweise für einen Ersatz gewährleisten.
