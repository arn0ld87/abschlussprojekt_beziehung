# Architecture Decision Records

Dieser Index führt die verbindlichen Architekturentscheidungen für Sitzplan. Produkt- und Implementierungsarbeit muss die akzeptierten Entscheidungen beachten und darf sie nicht stillschweigend abschwächen.

## Status

- **Accepted:** verbindlich angenommen und für nachfolgende Arbeit maßgeblich.
- **Superseded:** durch ein neueres ADR ersetzt; die historische Begründung bleibt erhalten.

## Index

| ADR | Entscheidung | Status |
|---|---|---|
| [ADR-0001](0001-nextjs-fullstack.md) | Next.js als Full-Stack-Anwendung | Accepted |
| [ADR-0002](0002-react-konva-editor.md) | React-Konva für interaktives 2D-Rendering | Accepted |
| [ADR-0003](0003-relational-jsonb-canvas.md) | Relationale Metadaten und versionierte JSONB-Canvas-Dokumente | Accepted |
| [ADR-0004](0004-autosave-snapshots.md) | Autosave und unveränderliche benannte Planversionen | Accepted |
| [ADR-0005](0005-ai-validated-commands.md) | KI erzeugt nur validierte Domänenkommandos | Accepted |
| [ADR-0006](0006-deterministic-optimizer.md) | Deterministischer Optimierer verantwortet Platzierungsgültigkeit | Accepted |
| [ADR-0007](0007-openai-compatible-and-ollama.md) | OpenAI-kompatibles BYOK und Ollama | Accepted |
| [ADR-0008](0008-single-user-test-data.md) | Single-User-Prototyp verwendet Testdaten | Accepted |
| [ADR-0009](0009-indexeddb-drafts.md) | IndexedDB speichert wiederherstellbare lokale Entwürfe | Accepted |
| [ADR-0010](0010-defer-granular-events.md) | Granulare Persistenz und Ereignishistorie sind zurückgestellt | Accepted |

## Pflege

Neue dauerhafte Architekturentscheidungen erhalten die nächste freie Nummer. Ein angenommenes ADR wird nicht inhaltlich umgedeutet. Soll es ersetzt werden, verweist ein neues ADR auf die abgelöste Entscheidung und setzt deren Status auf `Superseded`.
