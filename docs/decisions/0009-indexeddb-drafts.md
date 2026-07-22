# ADR-0009: Wiederherstellbare lokale Entwürfe in IndexedDB

**Status:** Accepted<br>
**Date:** 2026-07-22

## Context

Editorarbeit soll bei Netzunterbrechung oder vor einem erfolgreichen Autosave nicht verloren gehen. Ein lokaler Stand kann jedoch neuer oder anders sein als die letzte bestätigte Serverrevision.

## Decision

**IndexedDB stores recoverable local drafts.** Der Client spiegelt Editoränderungen gedrosselt als validierte lokale Entwürfe und bietet neuere Entwürfe nach dem Laden ausdrücklich zur Wiederherstellung an.

## Consequences

**PostgreSQL remains server truth; conflict resolution is explicit.** Ein lokaler Entwurf überschreibt nie stillschweigend eine Serverrevision. Vergleich, Neuladen oder Duplizieren bleiben bewusste Konfliktentscheidungen.

## Superseding this decision

Ein neues ADR muss mindestens gleichwertigen Schutz vor lokalem Datenverlust, eindeutige Serverwahrheit und nachvollziehbare Konfliktauflösung nachweisen.
