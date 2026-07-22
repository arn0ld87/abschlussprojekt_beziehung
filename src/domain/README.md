# src/domain

Domänenverträge des Sitzplan-Projekts: Entitäten, Value Objects, Invarianten.

## Abhängigkeitsrichtung

`src/domain` darf **nichts** aus diesem Repo importieren. Alle anderen Layer
dürfen aus `src/domain` importieren (Einbahnstraße, siehe
[`docs/architecture.md`](../../docs/architecture.md)).

Insbesondere: keine Importe aus Next.js, React, Konva, Datenbank- oder
KI-SDKs.

## Status M0

Leerer Platzhalter. Der einzige Export ist `M0_DOMAIN_STUB`, eine
Test-Doppelgänger-Konstante, die vom Smoke-Test in
[`tests/app/smoke.test.ts`](../../tests/app/smoke.test.ts) referenziert wird.

Echte Domänenverträge (Zod-Schemas, JSONB-repräsentierte Aggregate) folgen in
M3 — siehe Issue #20 (`sitzplan-domain-m3`).
