# ADR-0002: React-Konva für interaktives 2D-Rendering

**Status:** Accepted<br>
**Date:** 2026-07-22

## Context

Der Raumeditor braucht Auswahl, Drag-and-drop, Rotation und eine flüssige zweidimensionale Darstellung. Renderingzustand einer Bibliothek ist jedoch kein stabiler Fachvertrag für Speicherung, Versionierung, Export oder KI-Vorschau.

## Decision

**React-Konva owns interactive 2D rendering.** React-Komponenten leiten die Darstellung aus validierten Domänenzuständen ab und übersetzen Interaktionen in Anwendungsaktionen.

## Consequences

**Persist domain documents, never serialized Konva nodes.** Das Canvas-Dokument bleibt unabhängig von Konva. Wechsel der Renderingbibliothek, Migrationen und serverseitige Verarbeitung benötigen dadurch keine serialisierten UI-Knoten.

## Superseding this decision

Ein neues ADR muss den belegten Renderingbedarf, die Migration des Editors und die fortbestehende Unabhängigkeit des Canvas-Dokuments beschreiben.
