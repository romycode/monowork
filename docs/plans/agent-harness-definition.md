# Agent harness definition

**Priority:** 4 — Project management
**Added:** 2026-05-31
**Status:** Pending

## Goal

Define a Claude Code agent harness for this repository: a config + orchestration
scaffold under `.claude/` that declares named sub-agents, repo-tuned settings,
and lifecycle hooks. The harness encodes this repo's architecture (vertical
slices + ports & adapters), naming conventions, testing patterns, and the
plan-first workflow so that delegated work stays on-convention without
re-explaining the rules each time.

## Scope

New directory `.claude/` containing:

### Sub-agents (`.claude/agents/*.md`)

Each is a Markdown file with YAML frontmatter (`name`, `description`, `tools`,
`model`) plus a system prompt grounded in `AGENTS.md` / `docs/conventions.md`.

| Agent | Purpose | Tools |
|---|---|---|
| `slice-builder` | Build a full API vertical slice (`<feature>.ts` / `.db.ts` / `.repo.ts` / `.service.ts` / `.routes.ts` + helpers) honouring layering rules, `#/` alias, PUT-for-create semantics. | Read, Write, Edit, Grep, Glob, Bash |
| `test-author` | Write unit (`.service.test.ts`) + acceptance (`.routes.test.ts`) tests using `node:test`, `mock.fn`, `mockRepo`, builders, `app.inject()`. | Read, Write, Edit, Grep, Glob, Bash |
| `code-reviewer` | Review the working diff for layering violations, naming/import-alias breaches, and convention drift. Read-only — reports, does not edit. | Read, Grep, Glob, Bash |
| `vue-frontend` | Build `app/` features — Vue 3 + Pinia + Vue Router using the `~/` alias, base UI components, scoped styles, vitest + Testing Library. | Read, Write, Edit, Grep, Glob, Bash |
| `documenter` | Update docs (`AGENTS.md`, `docs/conventions.md`, `docs/planing.md`) to match the current code state and flag drift. | Read, Write, Edit, Grep, Glob, Bash |

### Settings (`.claude/settings.json`)

- `permissions`: allow `just *` and read-only git; deny force-push and reading `.env` secrets.
- `env`: repo-friendly defaults.
- `hooks`: wire the two lifecycle hooks below.

### Hooks (`.claude/hooks/*.sh`)

- `plan-guard.sh` — **PreToolUse** (`Write|Edit|MultiEdit`). Enforces the
  plan-first rule: blocks edits to source under `api/src`, `app/src`, or
  `packages/*/src` unless a plan change is pending in the working tree
  (`docs/plans/` or `docs/planing.md`). Bypass with `SKIP_PLAN_GUARD=1`.
- `format-on-stop.sh` — **Stop**. Best-effort `just format` when Docker is
  available; always exits 0 so it never blocks the agent.

### Documentation

- `.claude/README.md` describing the harness and how each piece is invoked.
- A short **Agent harness** section in `AGENTS.md` pointing to `.claude/`.

## Non-goals

- No runtime "agents" feature slice in the API (this is tooling config, not product).
- No changes to application code.

## Notes

- Agent prompts follow the **new** file-naming convention (`<feature>.service.ts`,
  `.routes.ts`, `.repo.ts`, `.db.ts`, domain `<feature>.ts`) as used in
  `api/src/users/` and documented in `AGENTS.md`. `docs/conventions.md` still
  references the older `-service.ts` / `-router.ts` / `-schema.ts` names — that
  drift is exactly what the `documenter` agent is meant to reconcile (tracked
  separately).
