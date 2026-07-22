# ADR-0004: Autosave und unveränderliche Planversionen

**Status:** Accepted<br>
**Date:** 2026-07-22

## Context

Laufende Editorarbeit soll ohne manuelle Speicherschritte geschützt sein. Gleichzeitig brauchen Lehrkräfte bewusst benannte Stände, die später zuverlässig wiederhergestellt werden können und nicht von weiteren Autosaves überschrieben werden.

## Decision

**Debounced autosave plus immutable named snapshots.** Autosave schreibt nach kurzer Ruhezeit ein validiertes Canvas-Dokument mit erwarteter Revision. Benannte Planversionen speichern unveränderliche Snapshots; Restore kopiert einen Snapshot in eine neue aktuelle Revision.

## Consequences

**Autosave protects work; snapshots protect meaningful states.** Revisionskonflikte führen nie zu stillem Überschreiben. Autosave und Planversion erfüllen getrennte Zwecke und ersetzen einander nicht.

## Superseding this decision

Ein neues ADR muss belegen, warum Revisionen und Planversionen reale Wiederherstellungsanforderungen nicht erfüllen, und eine verlustfreie Migration der bestehenden Historie festlegen.
