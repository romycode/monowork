# Agent harness (`.claude/`)

Claude Code configuration for this repository: named sub-agents, repo-tuned
settings, and lifecycle hooks. It encodes the architecture, conventions, and
plan-first workflow from [`AGENTS.md`](../AGENTS.md) and
[`docs/conventions.md`](../docs/conventions.md) so delegated work stays
on-convention without re-explaining the rules each time.

## Layout

```
.claude/
├── settings.json          # permissions, env, hook wiring (committed, shared)
├── agents/                # sub-agent definitions
│   ├── slice-builder.md
│   ├── test-author.md
│   ├── code-reviewer.md
│   ├── vue-frontend.md
│   └── documenter.md
└── hooks/
    ├── plan-guard.sh      # PreToolUse: enforce plan-first on source edits
    └── format-on-stop.sh  # Stop: best-effort `just format`
```

## Sub-agents

Each file in `agents/` is Markdown with YAML frontmatter (`name`,
`description`, `tools`, `model`) plus a system prompt. Claude delegates to one
automatically when a task matches its `description`, or you can ask explicitly
(e.g. "use the slice-builder to add an `invoices` feature").

| Agent | Use it for |
|---|---|
| `slice-builder` | A full API vertical slice (`<feature>.ts` / `.db.ts` / `.repo.ts` / `.service.ts` / `.routes.ts`) honouring the ports & adapters layering rules. |
| `test-author` | Unit (`.service.test.ts`) and acceptance (`.routes.test.ts`) tests using `node:test`, `mock.fn`, builders, and `app.inject()`. |
| `code-reviewer` | A read-only review of the working diff for layering, naming, import-alias, and convention violations. |
| `vue-frontend` | `app/` features — Vue 3 + Pinia + Vue Router, base UI components, scoped styles, vitest + Testing Library. |
| `documenter` | Bringing docs back in line with the code and flagging drift. Touches docs only. |

## Settings (`settings.json`)

- **permissions** — pre-allows `just *` and read-only git so routine commands
  don't prompt; denies force-push and reading `.env` secrets.
- **env** — shared environment defaults.
- **hooks** — wires the two scripts below.

`settings.json` is shared (committed). For personal overrides that should not be
committed, use `.claude/settings.local.json` (git-ignored by Claude Code
convention) — add it to `.gitignore` if you create one.

## Hooks

### `plan-guard.sh` — PreToolUse (`Write|Edit|MultiEdit`)

Enforces the plan-first hard rule: blocks edits to application source under
`api/src/`, `app/src/`, or `packages/*/src/` unless a plan change is pending in
the working tree (a new/modified `docs/plans/` file or a `docs/planing.md`
edit). Docs, config, `.claude/`, and `bruno/` are always allowed. Bypass an
already-planned task with `SKIP_PLAN_GUARD=1`.

### `format-on-stop.sh` — Stop

When the agent finishes a turn with uncommitted changes, runs `just format`
(best-effort) so work stays oxfmt-clean. Requires Docker; skips quietly if it
is unavailable and is always non-blocking (exits 0).

## Relationship to git hooks

These Claude Code hooks complement — they don't replace — the repo's git hooks
in `.githooks/` (`pre-commit`: lint + unit tests; `post-commit`: format).
`format-on-stop.sh` formats *while iterating*; the git hooks still run at commit
time. Run `just hooks` once per clone to enable the git hooks.
