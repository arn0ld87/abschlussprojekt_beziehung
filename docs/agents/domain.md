# Domain documentation

Sitzplan uses a single-context layout.

## Single-Context Layout

The single-context layout keeps the active domain state in one living document and freezes historical snapshots separately. Architectural decisions are pointers, not duplicates.

```
docs/context/
├── current/                # lebender Domänenstate (kanonisch)
│   └── domain.md           # aktuell gültige Begriffe und Invarianten
├── snapshots/              # eingefrorene Stand-Versionen
│   └── <rev>.md            # unveränderlicher Snapshot pro Veröffentlichung
└── decisions/              # Pointer auf ADRs (kein Duplikat)
    └── *.md                # Verweise auf docs/decisions/*.md
```

- `CONTEXT.md` at the repository root is the living state and mirrors `docs/context/current/domain.md`.
- `docs/context/snapshots/<rev>.md` freezes a released shape and is never edited in place.
- `docs/context/decisions/` only points at ADRs in `docs/decisions/`; it does not duplicate their content.
- A new snapshot is created whenever an accepted ADR changes domain terms or invariants.

## Workflow

1. Read root `CONTEXT.md` for canonical terms and invariants.
2. Read `docs/decisions/README.md` and relevant accepted ADRs before design changes.
3. Update `CONTEXT.md` only when a domain term or invariant changes.
4. Add an ADR for durable architectural decisions; never rewrite accepted history silently.
5. `docs/product.md` defines approved product scope but does not replace executable issues.
