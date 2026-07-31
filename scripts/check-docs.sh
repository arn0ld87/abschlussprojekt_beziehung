#!/usr/bin/env bash
set -euo pipefail

required=(
  README.md
  AGENTS.md
  CLAUDE.md
  CONTEXT.md
  ROADMAP.md
  CHANGELOG.md
  CONTRIBUTING.md
  SECURITY.md
  docs/STATUS.md
  docs/product.md
  docs/architecture.md
  docs/decisions/README.md
  docs/agents/issue-tracker.md
  docs/agents/triage-labels.md
  docs/agents/domain.md
  docs/prompts/minimax-m3-master.md
  docs/runbooks/backup-restore.md
  docs/runbooks/next-task.md
  docs/runbooks/release.md
  .claude/agents/sitzplan-ai-m3.md
  .claude/agents/sitzplan-doc-m3.md
  .claude/agents/sitzplan-domain-m3.md
  .claude/agents/sitzplan-frontend-m3.md
  .claude/agents/sitzplan-lead-m3.md
  .claude/agents/sitzplan-reviewer-m3.md
  .claude/agents/sitzplan-test-m3.md
  .claude/commands/sitzplan-next-task.md
  .github/ISSUE_TEMPLATE/feature.yml
  .github/ISSUE_TEMPLATE/bug.yml
  .github/PULL_REQUEST_TEMPLATE.md
  .github/workflows/docs.yml
)

for file in "${required[@]}"; do
  test -s "$file" || { echo "missing-or-empty: $file" >&2; exit 1; }
done

grep -Fq 'title: "[Feature]: "' .github/ISSUE_TEMPLATE/feature.yml
grep -Fq 'id: problem' .github/ISSUE_TEMPLATE/feature.yml
grep -Fq 'id: outcome' .github/ISSUE_TEMPLATE/feature.yml
grep -Fq 'id: acceptance-criteria' .github/ISSUE_TEMPLATE/feature.yml
grep -Fq 'id: blocked-by' .github/ISSUE_TEMPLATE/feature.yml
grep -Fq 'id: out-of-scope' .github/ISSUE_TEMPLATE/feature.yml
grep -Fq 'id: test-seam' .github/ISSUE_TEMPLATE/feature.yml
grep -Fq 'title: "[Bug]: "' .github/ISSUE_TEMPLATE/bug.yml
grep -Fq 'id: observed-behavior' .github/ISSUE_TEMPLATE/bug.yml
grep -Fq 'id: expected-behavior' .github/ISSUE_TEMPLATE/bug.yml
grep -Fq 'id: reproduction' .github/ISSUE_TEMPLATE/bug.yml
grep -Fq 'id: environment' .github/ISSUE_TEMPLATE/bug.yml
grep -Fq 'id: logs' .github/ISSUE_TEMPLATE/bug.yml
grep -Fq 'id: regression-test-seam' .github/ISSUE_TEMPLATE/bug.yml
grep -Fq 'Closes #' .github/PULL_REQUEST_TEMPLATE.md
grep -Fq 'VERDICT: APPROVE' .github/PULL_REQUEST_TEMPLATE.md
grep -Fq 'actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0' .github/workflows/docs.yml
grep -Fq 'persist-credentials: false' .github/workflows/docs.yml

shopt -s nullglob
agent_files=(.claude/agents/sitzplan-*-m3.md)
test "${#agent_files[@]}" -eq 7 || {
  echo "expected exactly 7 sitzplan agent files, found ${#agent_files[@]}" >&2
  exit 1
}

for agent in "${agent_files[@]}"; do
  grep -Fxq 'model: opus' "$agent"
  grep -Fxq 'effort: high' "$agent"
done

reviewer_agent=.claude/agents/sitzplan-reviewer-m3.md
grep -Fq 'no writes' "$reviewer_agent"
grep -Fxq 'VERDICT: APPROVE' "$reviewer_agent"
grep -Fxq 'VERDICT: REQUEST_CHANGES' "$reviewer_agent"

next_task_command=.claude/commands/sitzplan-next-task.md
next_task_runbook=docs/runbooks/next-task.md
grep -Fq 'genau das Issue' "$next_task_command"
grep -Fq 'genau ein Issue, einen Writer, ein Worktree und einen atomaren Commit' "$next_task_command"
grep -Fq 'genau ein Frontier-Issue' "$next_task_runbook"
grep -Fq 'exakt ein Issue, einen Writer, ein Worktree und einen atomaren lokalen Commit' "$next_task_runbook"

grep -Fq 'README.md` → `docs/STATUS.md` → `ROADMAP.md` → GitHub Issues' README.md
grep -Fq 'M0 — Foundation' ROADMAP.md
grep -Fq 'M7 — MVP-Härtung' ROADMAP.md
grep -Fq 'M12 — Produktivfreigabe' ROADMAP.md

placeholder_pattern='TO''DO|T''BD|FIX''ME|PLACE''HOLDER|\?\?\?'
if rg -n "$placeholder_pattern" \
  README.md AGENTS.md CLAUDE.md CONTEXT.md ROADMAP.md CHANGELOG.md \
  CONTRIBUTING.md SECURITY.md docs .claude .github scripts \
  --glob '*.md' --glob '*.yml' --glob '*.yaml' --glob '*.sh' \
  --glob '!docs/superpowers/plans/**' --glob '!scripts/check-docs.sh' \
  --glob '!.claude/worktrees/**'; then
  echo 'placeholder found' >&2
  exit 1
fi

for number in $(seq 1 10); do
  printf -v adr_number '%04d' "$number"
  adr_files=()
  # shellcheck disable=SC2207
  while IFS= read -r line; do
    adr_files+=("$line")
  done < <(compgen -G "docs/decisions/${adr_number}-*.md" || true)

  case "${#adr_files[@]}" in
    0)
      echo "missing ADR $adr_number" >&2
      exit 1
      ;;
    1) ;;
    *)
      echo "duplicate ADR $adr_number" >&2
      exit 1
      ;;
  esac
done

for adr in docs/decisions/[0-9][0-9][0-9][0-9]-*.md; do
  status_count=$(grep -Ec '^\*\*Status:\*\* (Accepted|Superseded)(<br>)?$' "$adr" || true)
  test "$status_count" -eq 1 || {
    echo "invalid ADR status: $adr" >&2
    exit 1
  }
  grep -Fq '## Context' "$adr"
  grep -Fq '## Decision' "$adr"
  grep -Fq '## Consequences' "$adr"
done

context_dir=docs/context
domain_mirror="$context_dir/current/domain.md"
test -s "$domain_mirror" || {
  echo "missing: $domain_mirror (Single-Context-Layout mirror of CONTEXT.md)" >&2
  exit 1
}
diff -q -w -B -Z "$domain_mirror" CONTEXT.md > /dev/null || {
  echo "$domain_mirror diverges from CONTEXT.md (whitespace-insensitive)" >&2
  exit 1
}

for number in $(seq 1 10); do
  printf -v n '%04d' "$number"
  ptr_dir="$context_dir/decisions"
  ptr_files=()
  while IFS= read -r -d '' line; do
    ptr_files+=("${line#./}")
  done < <(find "$ptr_dir" -maxdepth 1 -type f -name "${n}.md" -print0 2>/dev/null)
  case "${#ptr_files[@]}" in
    0)
      echo "missing decision pointer: $ptr_dir/${n}.md" >&2
      exit 1
      ;;
    1) ;;
    *)
      echo "duplicate decision pointer: $n (${ptr_files[*]})" >&2
      exit 1
      ;;
  esac
  ptr="${ptr_files[0]}"
  dests=$(grep -oE '\]\([^)]+\)' "$ptr" | sed -E 's/^\]\(//; s/\)$//' || true)
  dests=$(printf '%s\n' "$dests" | sed -E "s#^\\.\\./\\.\\./decisions/#docs/decisions/#")
  refs=$(printf '%s\n' "$dests" | grep -E "^docs/decisions/${n}-[A-Za-z0-9._-]+\\.md\$" || true)
  test -n "$refs" || {
    echo "decision pointer $ptr does not reference an ADR file" >&2
    exit 1
  }
  ref_count=$(printf '%s\n' "$refs" | wc -l | tr -d '[:space:]')
  test "$ref_count" -eq 1 || {
    echo "decision pointer $ptr references multiple ADRs" >&2
    exit 1
  }
  test -f "$refs" || {
    echo "decision pointer $ptr references missing ADR $refs" >&2
    exit 1
  }
done

ptr_dir="$context_dir/decisions"
shopt -s nullglob
all_ptr_files=("$ptr_dir"/*)
shopt -u nullglob
regular_count=0
for f in "${all_ptr_files[@]}"; do
  [ -f "$f" ] && regular_count=$((regular_count + 1))
done
test "$regular_count" -eq 10 || {
  echo "expected exactly 10 decision pointer files in $ptr_dir, found $regular_count" >&2
  exit 1
}

# TODO: redact-required validation
# This gate does not yet parse service YAML definitions. When a service kind
# with `logs: true` or `secrets: true` is introduced, the corresponding
# `redact.required` field must be enforced as `true`. Hook this validation in
# once a YAML-layer (e.g. yq) is available in the M0 application scaffolding.
# Intentionally non-blocking at the M0 documentation stage.
echo 'TODO: redact-required validation skipped (no YAML layer in M0 docs gate)' >&2

echo 'docs-check: ok'
