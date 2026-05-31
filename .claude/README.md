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
│   ├── planner.md
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
| `planner` | Authoring the plan artifacts (`docs/plans/<slug>.md` + a `docs/planing.md` row) at the start of a task. Context-frugal; reads the minimum, writes no code. Runs on `opus`. |
| `slice-builder` | A full API vertical slice (`<feature>.ts` / `.db.ts` / `.repo.ts` / `.service.ts` / `.routes.ts`) honouring the ports & adapters layering rules. |
| `test-author` | Unit (`.service.test.ts`) and acceptance (`.routes.test.ts`) tests using `node:test`, `mock.fn`, builders, and `app.inject()`. |
| `code-reviewer` | A read-only review of the working diff for layering, naming, import-alias, and convention violations. |
| `vue-frontend` | `app/` features — Vue 3 + Pinia + Vue Router, base UI components, scoped styles, vitest + Testing Library. |
| `documenter` | Bringing docs back in line with the code and flagging drift. Touches docs only. |

## Orchestration protocol

How the **primary (orchestrator) agent** drives the sub-agents. The orchestrator
plans and integrates — it does not edit application source itself; it delegates
to the specialists below and folds their work back together.

When the user asks for work:

1. **Plan & track first.** Delegate to the `planner` agent to create
   `docs/plans/<slug>.md` and a `docs/planing.md` row before any code (the
   plan-first hard rule; the `plan-guard` hook enforces it on source edits). The
   planner also proposes the branch name and the delegation breakdown for the
   steps below.
2. **Branch first — Conventional Commits.** Create one task branch
   `<type>/<slug>`, `<type>` ∈ `feat | fix | chore | docs | refactor | test |
   perf | build | ci`, e.g. `feat/invoices-slice`:

   ```sh
   git switch -c feat/<slug>
   ```

   All of the task's work lands on this single branch.
3. **Decompose & delegate.** Split the task into units and route each to the
   agent whose `description` fits. Maintain a live checklist (one entry per unit:
   pending → in-progress → done) so progress is visible.

   | Work | Agent |
   |---|---|
   | Plan authoring (step 1) | `planner` |
   | New/changed API slice | `slice-builder` |
   | API tests | `test-author` |
   | `app/` feature (view/component/store) | `vue-frontend` |
   | Doc updates / drift reconciliation | `documenter` |
   | Final diff review | `code-reviewer` |

4. **One worktree per agent.** Spawn each agent with the Agent tool's
   `isolation: "worktree"`. Each then operates in its **own git worktree** — an
   independent working copy backed by the same repository — so parallel agents
   never collide on the same files. Give each a precise, self-contained brief
   (which slice/files, which conventions, expected outputs).
5. **Commit each finished worktree to the branch.** When an agent reports done,
   review its output, then integrate its worktree changes onto the task branch
   with a Conventional Commits message and clean the worktree up. Integrate in a
   deterministic order (e.g. slice → tests → frontend → docs) and resolve any
   overlap as you go:

   ```sh
   git -C <worktree> add -A
   git -C <worktree> commit -m "<type>(scope): subject"
   # bring the commit onto the task branch, then remove the worktree
   git cherry-pick <sha>          # or merge the worktree's temp branch
   git worktree remove <worktree>
   ```

   > Git won't check the *same* branch out in two worktrees at once, so each
   > agent's worktree carries its own temp branch / detached HEAD; integration
   > means landing those commits onto the one task branch — not sharing a
   > checkout.
6. **Review & finish.** Run `code-reviewer` over the assembled diff, run
   `just lint` / `just typecheck` / `just test` (services up), fill the
   `Completed` date and move the planing row to **Done**. **Push or open a PR
   only when the user asks.**

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
