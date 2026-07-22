# src/infrastructure

Persistenz, externe Adapter, SDK-Wrapper (Datenbank, KI-Provider, Storage).

## Abhängigkeitsrichtung

`infrastructure` darf **nur** aus `src/domain` importieren und implementiert
Ports, die `services` oder `domain` definieren. UI darf `infrastructure` nicht
direkt ansprechen — der Weg führt über `services`.

## Status M0

Leerer Platzhalter. Adapter folgen in M6 (Persistenz) und M9/M10
(KI-Integration) — siehe Issues der jeweiligen Meilensteine.
