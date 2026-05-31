#!/bin/sh
# format-on-stop.sh — Stop hook
#
# Best-effort code formatting when the agent finishes a turn, so committed work
# stays oxfmt-clean. `just format` runs in a temporary Docker container, so this
# only acts when Docker is available; otherwise it skips quietly. It is always
# non-blocking: it exits 0 no matter what, so it can never wedge the agent.
#
# Mirrors the repo's post-commit hook (which also runs `just format`) but applies
# while iterating rather than only at commit time.
set -u

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$root" 2>/dev/null || exit 0

# Nothing to format unless something changed.
if git diff --quiet --ignore-submodules 2>/dev/null && \
   git diff --quiet --cached --ignore-submodules 2>/dev/null; then
  exit 0
fi

# Requires Docker + just; skip silently if the toolchain isn't present.
command -v docker >/dev/null 2>&1 || exit 0
command -v just   >/dev/null 2>&1 || exit 0
docker info        >/dev/null 2>&1 || exit 0

if just format >/dev/null 2>&1; then
  echo "format-on-stop: ran 'just format'." >&2
else
  echo "format-on-stop: 'just format' unavailable or failed — skipped." >&2
fi

exit 0
