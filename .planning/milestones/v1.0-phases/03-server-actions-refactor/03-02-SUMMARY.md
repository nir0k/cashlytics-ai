---
phase: 03-server-actions-refactor
plan: "02"
subsystem: auth
tags: [requireAuth, drizzle-orm, server-actions, userId-filtering, authorization]

# Dependency graph
requires:
  - phase: 03-01
    provides: requireAuth() helper with AuthResult discriminated union type
  - phase: 02-database-migration
    provides: userId columns on accounts and categories tables (NOT NULL after backfill)
provides:
  - accounts-actions.ts with full userId-scoped CRUD (SELECT/INSERT/UPDATE/DELETE)
  - account-actions.ts (legacy) with full userId-scoped CRUD
  - category-actions.ts with full userId-scoped CRUD
affects:
  - 03-03-expenses-incomes
  - 03-04-transfers
  - 04-auth-ui-components

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requireAuth() at top of every server action before any DB query"
    - "Compound WHERE clause: and(eq(table.id, id), eq(table.userId, authResult.userId)) for UPDATE/DELETE"
    - "Simple WHERE clause: eq(table.userId, authResult.userId) for SELECT all"
    - "Early return { success: false, error: 'Unauthorized' } on authResult.error"

key-files:
  created: []
  modified:
    - src/actions/accounts-actions.ts
    - src/actions/account-actions.ts
    - src/actions/category-actions.ts

key-decisions:
  - "compound WHERE for UPDATE/DELETE prevents cross-user record mutation without a separate ownership check query"
  - "requireAuth() replaces getCurrentUserId() in all three files — no fallback to SINGLE_USER_EMAIL"

patterns-established:
  - "Auth guard pattern: const authResult = await requireAuth(); if (authResult.error) return { success: false, error: 'Unauthorized' };"
  - "SELECT scoping: .where(eq(table.userId, authResult.userId))"
  - "Mutation scoping: .where(and(eq(table.id, id), eq(table.userId, authResult.userId)))"

requirements-completed: [AUTHZ-02, AUTHZ-03, DATA-01]

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 3 Plan 02: Account and Category Actions Refactor Summary

**requireAuth() + userId-scoped WHERE clauses applied to all account and category server actions — SELECT, INSERT, UPDATE, DELETE all isolated per user**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24T15:13:29Z
- **Completed:** 2026-02-24T15:16:58Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- All three account/category action files now import requireAuth instead of getCurrentUserId
- Every function (read and write) guards with requireAuth at top, returning Unauthorized on no session
- SELECT queries filter by userId so users see only their own data
- UPDATE/DELETE use compound AND userId check to prevent cross-user record mutation without a second ownership query round-trip

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor accounts-actions.ts (primary accounts file)** - `60c1e95` (feat)
2. **Task 2: Refactor account-actions.ts and category-actions.ts** - `319dfe0` (feat — included by lint-staged alongside 03-03 changes)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified

- `src/actions/accounts-actions.ts` - Primary account CRUD: replaced getCurrentUserId with requireAuth, added userId filter to all queries
- `src/actions/account-actions.ts` - Legacy account CRUD: replaced getCurrentUserId with requireAuth, added userId filter to all queries
- `src/actions/category-actions.ts` - Category CRUD: replaced getCurrentUserId with requireAuth, added userId filter to all queries

## Decisions Made

- Used compound `and(eq(table.id, id), eq(table.userId, authResult.userId))` for UPDATE/DELETE — eliminates need for a separate ownership pre-check while maintaining atomicity
- requireAuth() replaces getCurrentUserId() in all files — consistent with 03-01 decision that unauthenticated = Unauthorized (no SINGLE_USER_EMAIL fallback)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- lint-staged hook processed account-actions.ts and category-actions.ts changes during the 03-03 commit (the hook staged all dirty files in batch). Task 2 changes were committed in the 03-03 commit hash rather than a standalone commit. Changes are correct and fully committed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Accounts and categories are now fully userId-scoped — safe FK targets for expense/income/transfer actions
- 03-03 (expenses-actions, incomes-actions) and 03-04 (transfers-actions) refactors are the natural next steps
- Pattern is established and consistent: requireAuth + compound WHERE for all data tables

## Self-Check: PASSED

- FOUND: src/actions/accounts-actions.ts
- FOUND: src/actions/account-actions.ts
- FOUND: src/actions/category-actions.ts
- FOUND: .planning/phases/03-server-actions-refactor/03-02-SUMMARY.md
- FOUND commit: 60c1e95 (Task 1 - accounts-actions.ts)
- FOUND commit: 319dfe0 (Task 2 - account-actions.ts + category-actions.ts included by lint-staged)

---

_Phase: 03-server-actions-refactor_
_Completed: 2026-02-24_
