#!/bin/sh
# plan-guard.sh — PreToolUse hook (matcher: Write|Edit|MultiEdit)
#
# Enforces this repo's plan-first hard rule (AGENTS.md): no source edits until a
# plan exists. Blocks Write/Edit/MultiEdit to application source under api/src,
# app/src, or packages/*/src unless a plan change is pending in the working tree
# (a new/modified file under docs/plans/ or a change to docs/planing.md).
#
# Docs, config, .claude/, and everything outside the source roots are always
# allowed. Bypass entirely with SKIP_PLAN_GUARD=1.
#
# Contract: reads the tool-call JSON on stdin. Exit 0 to allow. Exit 2 to block
# (stderr is fed back to the model).
set -eu

input=$(cat)

# Escape hatch for continuing a previously-planned task.
if [ "${SKIP_PLAN_GUARD:-}" = "1" ]; then
  exit 0
fi

file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

# No file path (or unparseable) — nothing to guard.
[ -n "$file" ] || exit 0

# Project root: prefer the harness-provided var, fall back to git.
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

# Make the path relative to the project root for matching.
case "$file" in
  "$root"/*) rel=${file#"$root"/} ;;
  /*)        rel=$file ;;          # absolute but outside root — leave as-is
  *)         rel=$file ;;          # already relative
esac

# Only guard application source. Everything else (docs, config, .claude, bruno…)
# passes straight through.
case "$rel" in
  api/src/*|app/src/*|packages/*/src/*) : ;;
  *) exit 0 ;;
esac

# Is a plan change already pending in the working tree?
plan_changes=$(git -C "$root" status --porcelain -- docs/plans docs/planing.md 2>/dev/null || true)
if [ -n "$plan_changes" ]; then
  exit 0
fi

# No pending plan — block and tell the model what to do.
cat >&2 <<EOF
Plan-first rule (AGENTS.md): refusing to edit source file
  $rel
because no plan change is pending in the working tree.

Before editing application source you must:
  1. Create a plan at docs/plans/<task-slug>.md (goal, scope, tests, trade-offs).
  2. Add a row for the task in docs/planing.md.

Then retry. To bypass for an already-planned task, set SKIP_PLAN_GUARD=1.
EOF
exit 2
