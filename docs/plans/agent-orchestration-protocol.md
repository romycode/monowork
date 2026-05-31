# Agent orchestration protocol

**Priority:** 4 — Project management
**Added:** 2026-05-31
**Status:** Pending

## Goal

Define **how the primary (orchestrator) agent uses the sub-agents** defined in
`.claude/agents/`. When the user asks for work, the orchestrator should plan,
branch, delegate to the right specialised agents, isolate each agent in its own
git worktree to avoid collisions, track their progress, and fold each finished
worktree back onto the task branch.

## Protocol to codify

When given a task, the orchestrator:

1. **Plan & track first** — honour the plan-first rule: create
   `docs/plans/<slug>.md` and a `docs/planing.md` row before any code.
2. **Branch first (Conventional Commits)** — create one task branch named
   `<type>/<slug>` where `<type>` is a Conventional Commits type (`feat`, `fix`,
   `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`). All work for the
   task lands on this branch.
3. **Decompose & delegate** — split the task into units mapped to the
   specialised agents (`slice-builder`, `test-author`, `vue-frontend`,
   `documenter`; `code-reviewer` last). Keep a live status checklist.
4. **One worktree per agent** — spawn each agent with the Agent tool's
   `isolation: "worktree"` so it works in its own git worktree, preventing file
   collisions when agents run in parallel.
5. **Commit each finished worktree to the branch** — when an agent completes,
   review its output and integrate its worktree changes onto the task branch
   with a Conventional Commits message (`<type>(scope): subject`), in a
   deterministic order, resolving overlap. Clean up the worktree.
6. **Review & finish** — run `code-reviewer` over the assembled diff, run
   lint/typecheck/tests, mark the planing row complete. Push / open a PR only
   when the user asks.

## Scope

- `AGENTS.md` — add a concise, operative **Agent orchestration** section (this
  is `@`-included via `CLAUDE.md`, so it is always in context).
- `.claude/README.md` — add the full protocol with worktree mechanics and an
  agent-routing table.

## Non-goals

- No enforcement hook (the protocol is documented guidance, not a gate).
- No changes to application code or the existing agent definitions.

## Notes

- Git forbids the same branch being checked out in two worktrees at once, so
  each agent's worktree is independent (its own temp branch / detached state);
  integration happens by committing those changes onto the single task branch as
  each agent finishes — not by sharing one checkout.
