# Contributing

Sitzplan is currently at M0 and contains no application scaffold. Start from a `ready-for-agent` GitHub issue and follow the source order in `AGENTS.md`.

## Branches and commits

- Never work directly on `main`.
- Create one isolated worktree and one branch per issue.
- Name branches `type/issue-short-description`, for example `docs/42-release-runbook` or `feat/108-class-create`. Use `release/<issue>-<version>` for a release issue; this is the release-specific form of the same schema, with `release` as the type, the issue identifier and the version as its short description.
- Write Conventional Commit subjects in the form `type(scope): imperative summary` or `type: imperative summary`.
- Keep each commit atomic: it must implement one coherent vertical slice and include its matching tests and documentation.

## Development workflow

Use RED → GREEN → Refactor for every behavior change. First add a failing test for the requested behavior, make the smallest implementation pass, then improve the design without changing behavior. Documentation-only changes do not invent application tests; run the documentation and repository checks that actually exist at that revision.

Require all scope-appropriate tests and repository gates to exit `0` before publication. An independent reviewer `APPROVE` is additionally required and is not sufficient without green checks. Never bypass hooks with `--no-verify`, weaken assertions, add broad retries or skip tests to obtain a green result.

## Pull requests

Open one atomic pull request per issue. Include these required fields in the pull-request description:

- Issue: the closing issue reference.
- Scope: the single vertical slice delivered.
- Acceptance criteria: evidence for each criterion in the issue.
- Tests: exact commands and results.
- Documentation: the authoritative source updated, or a reason no documentation changed.
- Risks and rollback: known risks and the safe reversal path.
- Review: the independent review result; publication requires `APPROVE`.

Do not mix refactors, dependency updates or unrelated cleanup into the pull request. If the issue reveals separate work, create or update the appropriate issue instead.
