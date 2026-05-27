# Expand pre-commit hook to include acceptance tests

**Priority:** 4 — Project management
**Added:** 2026-05-27
**Status:** Pending

## Goal

The current pre-commit hook only runs `just lint` and `just test-unit`. Acceptance tests catch HTTP contract regressions and should also run before committing.

## Scope

- File to modify: `.githooks/pre-commit`

## Current hook

```sh
#!/bin/sh
set -e

just lint
just test-unit
```

## Proposed change

```sh
#!/bin/sh
set -e

just lint
just test-unit
just test-acceptance
```

## Trade-offs

- **Pro:** catches router/HTTP regressions before they reach the remote.
- **Con:** increases pre-commit time. Acceptance tests use `app.inject()` (no real server), so the overhead is modest.
- Integration tests (`just test-integration`) are intentionally excluded — they need a running database and are slower.

## Considerations

If the added time becomes annoying, consider moving acceptance tests to a pre-push hook instead.
