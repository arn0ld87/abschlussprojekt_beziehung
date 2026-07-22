# Release runbook

> **Target procedure for M7; not implemented during M0.** The current repository has no application scaffold, release artifact or automated product-test suite. This document defines the gate to implement and validate in the responsible milestone issues; it is not evidence that releases are currently operational.

Create a dedicated release issue and branch it as `release/<issue>-<version>`. This is the release-specific `type/issue-short-description` branch form. Work only from that isolated release branch. Stop at the first failed or missing gate; do not tag a partially verified release.

## Prepare the release candidate

1. Move the relevant `CHANGELOG.md` entries from `Unreleased` into the release version and date. Describe shipped behavior only.
2. Commit the changelog and every other approved release change as the final release-candidate commit.
3. Record that exact commit identifier. Make no further content changes before tagging it. Any change creates a new release-candidate commit and restarts every verification and review step below.

## Required release order

1. **Clean tree:** Confirm `release/<issue>-<version>` and the recorded final release-candidate commit, then require `git status --short` to return no entries.
2. **Dependencies locked:** Confirm every dependency manifest is represented by the committed lockfile and install with the frozen-lockfile mode introduced by the application scaffold.
3. **Scoped tests:** Run the exact tests for every changed module and record the commands and results.
4. **Full tests:** Run all repository lint, typecheck, unit/integration and end-to-end gates that exist for the release revision.
5. **Documentation check:** Run the current `bash scripts/check-docs.sh` gate and resolve every failure.
6. **Backup/restore smoke:** Execute the M7 smoke procedure against disposable data according to `docs/runbooks/backup-restore.md`; verify both database content and uploads.
7. **Changelog:** At the unchanged final release-candidate commit, verify that `CHANGELOG.md` contains the intended version and date and completely and correctly describes the shipped contents. Do not edit during this gate; any failure requires a new commit and a restart from step 1.
8. **Fixed-commit review:** Give the reviewer the fixed base commit, release issue and final release-candidate commit. Require all applicable gates to exit `0` and an explicit `APPROVE` for that exact commit.
9. **Version tag:** Without any intervening content change, create the version tag on the approved final release-candidate commit and verify the tag points to that commit.

Record the release issue, branch, final release-candidate commit, dependency-lock verification, exact test commands and results, backup identifier, restore target, smoke evidence, reviewer decision, changelog version and tag. Never use real student data in release verification.
