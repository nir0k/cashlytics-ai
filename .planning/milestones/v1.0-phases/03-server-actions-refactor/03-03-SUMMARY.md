---
phase: 03-server-actions-refactor
plan: "03"
subsystem: auth
tags: [drizzle-orm, server-actions, authorization, fk-validation, user-isolation]

# Dependency graph
requires:
  - phase: 03-01
    provides: requireAuth() helper with discriminated union AuthResult type
  - phase: 02-database-migration
    provides: userId columns on expenses, incomes, dailyExpenses tables
provides:
  - expenses-actions.ts with requireAuth, userId filtering, and accountId/categoryId FK validation
  - incomes-actions.ts with requireAuth, userId filtering, and accountId FK validation
  - expense-actions.ts (legacy) with requireAuth, userId filtering, accountId/categoryId FK validation
  - income-actions.ts (legacy) with requireAuth, userId filtering, accountId FK validation
  - daily-expenses-actions.ts with requireAuth, userId filtering, accountId/categoryId FK validation
affects:
  - 03-04
  - 03-05
  - 04-auth-ui-components
  - 05-registration-mode-logic

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requireAuth guard at top of every server action before any DB query"
    - "Always-included userId condition as first element in conditions array"
    - "FK validation pattern: select from accounts/categories where id=X AND userId=Y before insert"
    - "UPDATE/DELETE WHERE uses and(eq(table.id, id), eq(table.userId, userId)) double predicate"
    - "deleteX fetches with userId filter before balance reversal to enforce ownership"

key-files:
  created: []
  modified:
    - src/actions/expenses-actions.ts
    - src/actions/incomes-actions.ts
    - src/actions/expense-actions.ts
    - src/actions/income-actions.ts
    - src/actions/daily-expenses-actions.ts

key-decisions:
  - "FK validation on accountId/categoryId in all create operations — users cannot attach data to accounts they do not own"
  - "userId always included in conditions array (not conditionally pushed) to guarantee filter is never accidentally omitted"
  - "Balance reversal queries in delete/create are internal accounting ops and do not need userId filter (accountId already FK-validated)"
  - "Changed createDailyExpense in expense-actions.ts from NewDailyExpense to Omit<NewDailyExpense, 'userId'> to remove caller responsibility for userId"

patterns-established:
  - "Conditions array pattern: const conditions = [eq(table.userId, userId)] — userId always first"
  - "FK guard pattern: select+limit(1) then check if null before insert"
  - "Double-predicate WHERE: and(eq(table.id, id), eq(table.userId, userId)) for UPDATE/DELETE"

requirements-completed: [AUTHZ-02, AUTHZ-03, DATA-01, DATA-10]

# Metrics
duration: 5min
completed: 2026-02-24
---

# Phase 03 Plan 03: Expense, Income, and Daily-Expense Actions Refactor Summary

**requireAuth + per-user data isolation + FK ownership validation applied to all five expense/income server action files**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-24T15:13:41Z
- **Completed:** 2026-02-24T15:18:53Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- All five action files now call requireAuth() as the first step — unauthenticated calls return `{ success: false, error: "Unauthorized" }`
- All SELECT queries scoped to the authenticated user via `eq(table.userId, userId)` as a mandatory, always-included condition
- createExpense and createDailyExpense validate both accountId AND categoryId FK ownership before insert, preventing cross-user account attachment
- createIncome validates accountId FK ownership before insert
- UPDATE/DELETE use double-predicate `and(eq(id), eq(userId))` ensuring operations only affect owned records
- deleteExpense and deleteIncome fetch with userId filter before balance reversal, enforcing ownership before account mutation

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor expenses-actions.ts and incomes-actions.ts** - `319dfe0` (feat)
2. **Task 2: Refactor expense-actions.ts, income-actions.ts, and daily-expenses-actions.ts** - `de56a97` (feat)

## Files Created/Modified

- `src/actions/expenses-actions.ts` - Primary expense CRUD: requireAuth, userId filter on all queries, accountId+categoryId FK validation on create
- `src/actions/incomes-actions.ts` - Primary income CRUD: requireAuth, userId filter on all queries, accountId FK validation on create
- `src/actions/expense-actions.ts` - Legacy expense+dailyExpense CRUD: requireAuth, userId filter, FK validation, categories import added
- `src/actions/income-actions.ts` - Legacy income CRUD: requireAuth, userId filter, accountId FK validation on create
- `src/actions/daily-expenses-actions.ts` - Daily expense CRUD: requireAuth, userId filter on all queries, accountId+categoryId FK validation on create

## Decisions Made

- FK validation on accountId/categoryId in all create operations — without this, a user could attach expenses to another user's account by guessing UUIDs (DATA-10 requirement)
- userId is always the first element of the conditions array (not conditionally pushed) to guarantee it is never accidentally omitted
- Balance reversal queries in deleteExpense/deleteIncome use a specific accountId that was already verified via FK ownership — these internal accounting operations do not need an additional userId filter
- Changed createDailyExpense signature in expense-actions.ts from `NewDailyExpense` to `Omit<NewDailyExpense, "userId">` to remove caller responsibility for providing userId

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The lint-staged pre-commit hook reformatted files with prettier/eslint after each write. The hook automatically applied the correct formatting. No manual intervention needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All five files are ready for use by UI components in Phase 4
- Any caller that passed userId in data objects to createDailyExpense (expense-actions.ts) must be updated — userId is now injected server-side
- category-actions.ts still uses getCurrentUserId — to be addressed in 03-04 or later
