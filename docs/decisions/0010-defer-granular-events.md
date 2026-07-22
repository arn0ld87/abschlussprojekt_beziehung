# ADR-0010: Granulare Persistenz und Ereignishistorie zurückstellen

**Status:** Accepted<br>
**Date:** 2026-07-22

## Context

Versionierte Canvas-Dokumente, Revisionen und benannte Planversionen decken die bestätigten MVP-Abläufe ab. Objektweise Persistenz und eine vollständige Ereignishistorie würden Migration, Synchronisation und Betrieb deutlich komplexer machen, ohne derzeit belegten MVP-Nutzen.

## Decision

**Granular persistence and event history are deferred.** Das MVP speichert vollständige, versionierte Canvas-Dokumente und fachlich wichtige Planversionen. Objektweise Persistenz und feingranulare Zeitreise werden nicht vorgezogen.

## Consequences

**M9/M10 require a new ADR proving snapshots insufficient.** Arbeiten an granularer Persistenz oder vollständiger Ereignishistorie beginnen erst, wenn ein neues akzeptiertes ADR einen realen Bedarf und eine sichere Migration belegt.

## Superseding this decision

Das ersetzende ADR muss konkrete Anforderungen, Messdaten oder Abfragen nennen, die der Snapshot-Ansatz nicht erfüllt, und Migration, Konsistenz, Restore sowie Betrieb behandeln.
