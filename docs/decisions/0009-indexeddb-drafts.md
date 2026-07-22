# ADR-0009: Wiederherstellbare lokale Entwürfe in IndexedDB

**Status:** Accepted<br>
**Date:** 2026-07-22

## Context

Editorarbeit soll bei Netzunterbrechung oder vor einem erfolgreichen Autosave nicht verloren gehen. Ein lokaler Stand kann jedoch neuer oder anders sein als die letzte bestätigte Serverrevision.

## Decision

**IndexedDB stores recoverable local drafts.** Der Client spiegelt Editoränderungen gedrosselt als validierte lokale Entwürfe und bietet neuere Entwürfe nach dem Laden ausdrücklich zur Wiederherstellung an.

## Consequences

**PostgreSQL remains server truth; conflict resolution is explicit.** Ein lokaler Entwurf überschreibt nie stillschweigend eine Serverrevision. Vergleich, Neuladen oder Duplizieren bleiben bewusste Konfliktentscheidungen.

## Spezifikation

**Canonical form follows the versioned Zod contract from `docs/product.md` §8.2 and §9.** Lokale Entwürfe verwenden dieselbe Canvas-Dokument-Schemafamilie wie der Server: ein Zod-Schema mit `version`-Feld als Diskriminator, gegen das jeder Schreibvorgang validiert wird. Die Form, der Diskriminator und die Konventionen sind in `docs/product.md` und ADR-0003 verbindlich festgelegt; dieses ADR führt keine eigene Dokumentform ein.

**Every restore creates a new revision.** Übernimmt eine Lehrkraft einen lokalen Entwurf, entsteht daraus eine neue Serverrevision mit eigener ID und eigenem Zeitstempel. IndexedDB-Inhalte werden nicht in eine bestehende Revision zurückgeschrieben; die Serverhistorie bleibt fortlaufend und unveränderlich.

**Additive evolution, no in-place mutation.** Schemaversionen werden ausschließlich additiv erweitert. Breaking Changes erfordern eine neue Major-Version und eine validierte Migration, die alte Revisionen und Entwürfe verlustfrei in die neue Form überführt, bevor Leser und Schreiber die neue Version akzeptieren. Bestehende Serverrevisionen und IndexedDB-Entwürfe werden nie im Speicher überschrieben, sondern durch eine neue Revision ersetzt.

## Superseding this decision

Ein neues ADR muss mindestens gleichwertigen Schutz vor lokalem Datenverlust, eindeutige Serverwahrheit und nachvollziehbare Konfliktauflösung nachweisen.
