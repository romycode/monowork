# Planner agent

**Priority:** 4 — Project management
**Added:** 2026-05-31
**Status:** Pending

## Goal

Add a `planner` sub-agent to the harness, focused solely on producing the
planning artifacts the plan-first workflow requires — a `docs/plans/<slug>.md`
file and a `docs/planing.md` row — while gathering only the minimum context
needed to scope the task. It plans; it does not implement.

## Why

Every task must be planned before code (AGENTS.md hard rule; `plan-guard`
enforces it). Centralising that in a context-frugal specialist keeps the
orchestrator lean: it delegates "write the plan" without itself loading the
whole codebase, and the planner is tuned to read narrowly (targeted
grep/glob/git, one template plan) rather than opening files wholesale.

## Scope

- **New** `.claude/agents/planner.md` — frontmatter (`name`, `description`,
  lean `tools`, `model`) + a system prompt that:
  - Outputs exactly the plan file (matching existing `docs/plans/*.md` headings:
    Title, Priority, Added, Status, Goal, Scope, tests/changes, trade-offs/notes)
    and the `docs/planing.md` row (description, plan link, today's date in
    **Added**, empty **Completed**), placed under the right priority section.
  - Uses a kebab-case `<slug>` and suggests the Conventional Commits branch
    `<type>/<slug>` for the orchestrator.
  - **Context discipline:** read `docs/planing.md` + one recent plan as a
    template; use `git ls-files` / Glob / Grep to locate relevant code and read
    only the specific files/lines needed to scope. Stop gathering once goal,
    scope, tests, and trade-offs can be written. Never read directories wholesale.
  - Does not implement and does not create branches.
- **Update** `AGENTS.md` (harness agent list + orchestration step 1) and
  `.claude/README.md` (Sub-agents table + routing table + step 1) to route
  planning through `planner`.

## Non-goals

- No implementation, no branch/worktree creation (the orchestrator owns those).
- No new hook.

## Notes

- Today's date comes from the harness `currentDate` context; the planner uses it
  for the **Added** column.
