@AGENTS.md

# Claude orchestration

`/sitzplan-next-task` handles exactly one issue carrying `ready-for-agent`. The lead reads the complete issue, its comments and every blocker before dispatching work. Assign exactly one writing worker to that issue, exactly one isolated worktree and exactly one atomic local commit.

Writing workers never push. A reviewer is read-only and receives both the fixed base commit and the issue commit. Publication requires every applicable test and repository gate to exit `0` and an explicit reviewer `APPROVE` for that fixed commit. `APPROVE` is additional evidence, not a substitute for green checks, and is never sufficient by itself.

Never dispatch two writers within one issue run. At most two writers may work concurrently only through two already separated, independent issues in separate `/sitzplan-next-task` runs, each with its own writer, worktree, atomic commit and pull request. Their files, contracts, migrations and underlying causes must be demonstrably independent. MiniMax-M3 is the primary implementation model. The lead retains architecture, security, migrations, ambiguous specifications and cross-module contracts.

Treat worker summaries as navigation aids, never as evidence. The lead inspects the commits and runs all scope-appropriate checks and repository gates independently. `AGENTS.md` is the canonical source for Agent skills and is imported above.
