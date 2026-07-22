# AGENTS.md

## Read order

README.md → docs/STATUS.md → ROADMAP.md → GitHub issue → CONTEXT.md → relevant ADRs.

Follow this order before changing the repository. Treat `docs/product.md` and `docs/architecture.md` as binding product and architecture references, not as competing roadmaps.

## Mandatory workflow

1. Never work directly on `main`.
2. Use one issue, one writer, one worktree, one vertical slice, one atomic commit and one pull request.
3. Use RED → GREEN → Refactor for behavior changes.
4. Require every scope-applicable test and repository gate to exit `0` before publication.
5. Update only the matching documentation source in the same slice.
6. Never weaken assertions, add broad retries, or skip tests to make CI green.
7. Never place secrets, real student data, provider keys or local host configuration in the repository.

Require an independent reviewer `APPROVE` in addition to green tests and gates. Never treat `APPROVE` alone as sufficient for publication.

## Architecture hard stops

- Persist Zod-versioned domain documents, not Konva node serialization.
- AI output cannot directly mutate canvas, services or database.
- Hard seating rules cannot be violated.
- Restore creates a new revision.
- M9/M10 require a new accepted ADR.

## Verification commands

Run the documentation gate:

```bash
bash scripts/check-docs.sh
```

Run the following application gates only after the responsible milestone issue has introduced the corresponding scripts. They do not exist during the current M0 documentation-only state:

```bash
bun run lint
bun run typecheck
bun run test
bun run test:e2e
```

## Agent skills

### Issue tracker

Use GitHub Issues; see [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).

### Triage labels

Use the canonical five-role mapping; see [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md).

### Domain docs

Use the single-context layout; see [`docs/agents/domain.md`](docs/agents/domain.md).
