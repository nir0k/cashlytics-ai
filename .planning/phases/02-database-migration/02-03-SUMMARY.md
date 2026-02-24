---
phase: 02-database-migration
plan: 03
subsystem: database
tags: [drizzle, migration, backfill, not-null, data-isolation]

# Dependency graph
requires:
  - phase: 02-database-migration
    plan: 02
    provides: Nullable userId FK columns on all 8 data tables, migration 0004 applied
provides:
  - Backfill script assigning all existing data to SINGLE_USER_EMAIL user
  - NOT NULL constraint on userId for all 8 data tables
  - Migration 0005 with ALTER COLUMN SET NOT NULL
affects: [data-isolation, user-queries, multi-tenant, seed-data]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Nullable FK → backfill → NOT NULL for safe schema migrations
    - Idempotent user creation with onConflictDoNothing
    - Dynamic table iteration for bulk updates

key-files:
  created:
    - scripts/migrate-add-userId.ts
    - drizzle/0005_high_pandemic.sql
  modified:
    - src/lib/db/schema.ts
    - package.json

key-decisions:
  - "Backfill script uses SINGLE_USER_EMAIL environment variable for flexibility"
  - "Script verifies no NULL userId remain before completing"
  - "Migration 0005 adds NOT NULL after backfill ensures data integrity"

patterns-established:
  - "Pattern: npx tsx for running TypeScript migration scripts"
  - "Pattern: Dynamic table iteration with typed any for bulk operations"

requirements-completed:
  - MIG-03

# Metrics
duration: 24 min
completed: 2026-02-24
---

# Phase 2 Plan 03: Backfill userId and NOT NULL Constraint Summary

**Backfill script assigns all existing data to SINGLE_USER_EMAIL user, then NOT NULL constraint applied to enforce data isolation at the database level.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-02-24T13:33:14Z
- **Completed:** 2026-02-24T13:57:19Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Created backfill migration script (scripts/migrate-add-userId.ts)
- Script creates single user from SINGLE_USER_EMAIL if not exists
- Backfilled 1 existing account row to single user (admin@cashlytics.local)
- Added NOT NULL constraint to userId on all 8 data tables
- Generated and applied migration 0005_high_pandemic.sql
- Verified database enforces NOT NULL on insert without userId

## Task Commits

Each task was committed atomically:

1. **Task 1: Create backfill migration script** - `04ca8a5` (feat)
2. **Task 2: Run backfill script** - `f2f5a9e` (fix - npx tsx)
3. **Task 3: Make userId NOT NULL and generate final migration** - `0287652` (feat)

**Plan metadata:** Pending

## Files Created/Modified

- `scripts/migrate-add-userId.ts` - Backfill script for userId assignment
- `src/lib/db/schema.ts` - Added .notNull() to userId on all 8 data tables
- `drizzle/0005_high_pandemic.sql` - Migration with ALTER COLUMN SET NOT NULL
- `package.json` - Added db:migrate-userId script

## Decisions Made

1. **SINGLE_USER_EMAIL environment variable** - Flexible configuration for single user email, defaults to admin@cashlytics.local for demo.

2. **npx tsx for script execution** - Changed from `tsx` to `npx tsx` to ensure tsx is available in environments without global installation.

3. **Verification before completion** - Backfill script verifies no NULL userId remain in any table before declaring success.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Use npx tsx for script execution**

- **Found during:** Task 2 (running backfill script)
- **Issue:** `tsx` command not found - tsx not installed globally
- **Fix:** Changed package.json script from `tsx` to `npx tsx` to auto-install tsx when needed
- **Files modified:** package.json
- **Verification:** npm run db:migrate-userId executes successfully
- **Committed in:** f2f5a9e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal - necessary fix for script execution. No scope creep.

## Issues Encountered

- **Docker not available:** Docker daemon could not start due to iptables permissions. Database was already running and accessible via DATABASE_URL, so migration proceeded without Docker.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 8 data tables have NOT NULL userId constraint
- Single user (admin@cashlytics.local) owns all existing data
- Backfill script available for future migrations
- Migration 0005 applied successfully
- **Ready for plan 02-04:** Update seed-demo.sql with userId columns

---

_Phase: 02-database-migration_
_Completed: 2026-02-24_
