---
phase: 02-database-migration
plan: 01
subsystem: database
tags: [auth.js, drizzle, migration, schema, oauth]

# Dependency graph
requires:
  - phase: 01-core-auth-infrastructure
    provides: Auth.js setup with DrizzleAdapter, JWT sessions, users table
provides:
  - Auth.js adapter tables with prefixed names (auth_accounts, auth_sessions, auth_verification_tokens)
  - Extended users table with emailVerified and image fields
  - DrizzleAdapter configured with custom table names
affects: [auth-flows, oauth-integration, password-reset]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Prefixed Auth.js table names to avoid conflicts with domain tables
    - Composite primary key for verification tokens table

key-files:
  created:
    - drizzle/0004_slimy_korath.sql
  modified:
    - src/lib/db/schema.ts
    - auth.ts

key-decisions:
  - "Prefixed Auth.js tables with 'auth_' to avoid conflict with financial accounts table"
  - "Used composite primary key (identifier, token) for auth_verification_tokens per Auth.js spec"
  - "Migration uses ALTER TABLE for users table since it already exists from Phase 1"

patterns-established:
  - "Pattern: Custom table names for Auth.js adapter via DrizzleAdapter(db, { usersTable, accountsTable, ... })"

requirements-completed:
  - MIG-01

# Metrics
duration: 21 min
completed: 2026-02-24
---

# Phase 2 Plan 01: Auth.js Adapter Tables Summary

**Auth.js adapter tables with prefixed names to avoid conflict with existing financial accounts table, enabling OAuth provider linking and password reset functionality.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-02-24T13:01:41Z
- **Completed:** 2026-02-24T13:09:15Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Extended users table with emailVerified and image fields for Auth.js compatibility
- Created auth_accounts table for OAuth provider linking with prefixed name
- Created auth_sessions table for future database session strategy
- Created auth_verification_tokens table with composite primary key
- Configured DrizzleAdapter with custom table names to avoid naming conflicts

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend users table and add Auth.js adapter tables to schema** - `eee2dfc` (feat)
2. **Task 2: Update DrizzleAdapter with custom table configuration** - `908ae01` (feat)
3. **Task 3: Generate and run Auth.js tables migration** - `bb1d00a` (feat)

**Plan metadata:** `da652bf` (docs: complete plan)

## Files Created/Modified

- `src/lib/db/schema.ts` - Extended users table, added auth_accounts, auth_sessions, auth_verification_tokens tables
- `auth.ts` - Configured DrizzleAdapter with custom table names
- `drizzle/0004_slimy_korath.sql` - Migration for Auth.js tables and user_id columns
- `src/actions/analytics-actions.ts` - Fixed CategoryBreakdown type to include userId

## Decisions Made

1. **Prefixed Auth.js table names** - Used `auth_accounts`, `auth_sessions`, `auth_verification_tokens` instead of default `accounts`, `sessions`, `verification_tokens` to avoid conflict with existing financial accounts table.

2. **Composite primary key for verification tokens** - Auth.js requires a composite primary key on (identifier, token) for the verification tokens table, not a single-column primary key.

3. **ALTER TABLE for users** - Modified migration to use ALTER TABLE instead of CREATE TABLE for users since it already exists from Phase 1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed CategoryBreakdown type for userId field**

- **Found during:** Task 1 (schema update)
- **Issue:** Adding userId to categories table caused TypeScript error - CategoryBreakdown fallback object was missing userId field
- **Fix:** Added `userId: null` to the fallback category object in analytics-actions.ts
- **Files modified:** src/actions/analytics-actions.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** eee2dfc (Task 1 commit)

**2. [Rule 1 - Bug] Fixed verification tokens primary key structure**

- **Found during:** Task 2 (DrizzleAdapter configuration)
- **Issue:** Auth.js DrizzleAdapter expects verification tokens table with composite primary key (identifier, token), not single-column primary key
- **Fix:** Changed from `.primaryKey()` on token column to composite primary key using Drizzle's `primaryKey()` helper
- **Files modified:** src/lib/db/schema.ts
- **Verification:** TypeScript compiles without errors, matches Auth.js adapter types
- **Committed in:** 908ae01 (Task 2 commit)

**3. [Rule 3 - Blocking] Fixed migration for existing users table**

- **Found during:** Task 3 (migration generation)
- **Issue:** Drizzle Kit generated CREATE TABLE for users, but users table already exists from Phase 1
- **Fix:** Manually edited migration to use ALTER TABLE with ADD COLUMN IF NOT EXISTS for email_verified and image columns
- **Files modified:** drizzle/0004_slimy_korath.sql
- **Verification:** Migration file structure correct for existing database
- **Committed in:** bb1d00a (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes necessary for correctness and compatibility. No scope creep.

## Issues Encountered

- **Migration not run:** Docker/database not available during execution. Migration file generated and ready to run when database is accessible. Run `npm run db:migrate` after starting Docker.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auth.js adapter tables schema ready
- DrizzleAdapter configured with prefixed table names
- Migration file generated (0004_slimy_korath.sql)
- **Blocker:** Migration needs to be run when database is available

---

_Phase: 02-database-migration_
_Completed: 2026-02-24_
