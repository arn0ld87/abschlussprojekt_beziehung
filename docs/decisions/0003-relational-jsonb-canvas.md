# ADR-0003: Relationale Metadaten und JSONB-Canvas-Dokumente

**Status:** Accepted<br>
**Date:** 2026-07-22

## Context

Klassen, Schülerprofile, Räume, Sitzpläne, Planversionen und Löschstatus benötigen relationale Integrität und Abfragen. Der räumliche Editorzustand entwickelt sich als zusammenhängender Vertrag und wird bei Autosave und Restore vollständig verarbeitet.

## Decision

**Relational metadata plus Zod-versioned JSONB canvas documents.** PostgreSQL hält relationale Metadaten; Raum- und Sitzplandokumente werden als JSONB gespeichert und vor jedem Schreiben durch versionsgebundene Zod-Schemas validiert.

## Consequences

**Schema version and migrations are mandatory before contract changes.** Leser und Schreiber behandeln die Schemaversion ausdrücklich. Eine Vertragsänderung ohne validierte Migration ist nicht zulässig.

## Superseding this decision

Ein neues ADR muss Abfrage- oder Kollaborationsbedarf nachweisen, Datenmigration und Rückwärtskompatibilität festlegen und die Auswirkungen auf Autosave, Restore, Export und lokale Entwürfe erklären.
