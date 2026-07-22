# ADR-0008: Single-User-Prototyp mit Testdaten

**Status:** Accepted<br>
**Date:** 2026-07-22

## Context

Der MVP validiert Arbeitsabläufe für eine einzelne Lehrkraft. Mehrbenutzerbetrieb und der Umgang mit echten Schuldaten erfordern zusätzliche Autorisierung, Datenisolation, Datenschutz- und Betriebsmaßnahmen.

## Decision

**Single-user prototype uses test data.** Der MVP wird ausschließlich mit Test- und Fantasiedaten entwickelt, getestet und betrieben und besitzt keine Produktivfreigabe für echte Schuldaten.

## Consequences

**Multi-user and production-data readiness remain post-MVP milestones.** Rollen, Mandanten, produktive Datenschutzmaßnahmen und eine ausdrückliche Datenfreigabe werden nicht als implizite MVP-Eigenschaften behandelt.

## Superseding this decision

Neue ADRs müssen Mehrbenutzerbetrieb und Produktivfreigabe getrennt bewerten und die jeweiligen Autorisierungs-, Datenschutz-, Lösch- und Betriebsnachweise festlegen.
