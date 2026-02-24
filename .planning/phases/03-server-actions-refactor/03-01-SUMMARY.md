---
phase: 03-server-actions-refactor
plan: "01"
subsystem: auth
tags: [auth, typescript, discriminated-union, session]

# Dependency graph
requires:
  - phase: 01-core-auth-infrastructure
    provides: auth() function from @/auth that returns Session with user.id
provides:
  - requireAuth() utility function returning typed AuthResult discriminated union
  - AuthSuccess, AuthFailure, AuthResult TypeScript types for session guards
  - Deprecation marker on getCurrentUserId() pointing to new helper
affects: [03-02, 03-03, 03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [discriminated-union-auth-guard, require-auth-at-top-of-action]

key-files:
  created:
    - src/lib/auth/require-auth.ts
  modified:
    - src/lib/auth/user-id.ts

key-decisions:
  - "requireAuth() has no SINGLE_USER_EMAIL fallback — unauthenticated always returns { error: 'Unauthorized' }"
  - "AuthResult uses never-based discriminated union so TypeScript narrows userId to string after error check"
  - "No 'use server' directive on require-auth.ts — it's a utility, not a Server Action"
  - "user-id.ts retained (not deleted) during Phase 3 migration; will be removed once all callers updated"

patterns-established:
  - "Session guard pattern: call requireAuth() at top of every server action, check error before DB query"
  - "Discriminated union return type: { userId: string; error?: never } | { userId?: never; error: 'Unauthorized' }"

requirements-completed: [AUTHZ-02, AUTHZ-03]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 3 Plan 01: requireAuth Helper Summary

**Strict session guard with AuthResult discriminated union — requireAuth() replaces SINGLE_USER_EMAIL fallback across all server actions**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-24T15:10:12Z
- **Completed:** 2026-02-24T15:11:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src/lib/auth/require-auth.ts` with `requireAuth()` function and `AuthResult` discriminated union type
- `requireAuth()` calls `auth()` from `@/auth` — returns `{ userId }` on success or `{ error: "Unauthorized" }` with no fallback
- Marked `getCurrentUserId()` in `user-id.ts` as `@deprecated` with JSDoc pointing to the new helper

## Task Commits

Each task was committed atomically:

1. **Task 1: Create requireAuth helper** - `d307ae5` (feat)
2. **Task 2: Deprecate user-id.ts** - `83d79b2` (chore)

## Files Created/Modified

- `src/lib/auth/require-auth.ts` - New session guard utility: exports requireAuth(), AuthResult, AuthSuccess, AuthFailure
- `src/lib/auth/user-id.ts` - Added @deprecated JSDoc pointing to require-auth.ts; function body unchanged

## Decisions Made

- No `SINGLE_USER_EMAIL` fallback in `requireAuth()` — Phase 3's goal is strict per-user isolation, any unauthenticated call must return an error
- Used `never`-based discriminated union (`error?: never` / `userId?: never`) so TypeScript narrows the type correctly after `if (authResult.error)` check, making `authResult.userId` typed as `string` (not `string | undefined`) in the success branch
- No `"use server"` directive — this is a utility function that gets imported by Server Actions, not a Server Action itself
- `user-id.ts` retained during migration (not deleted) since all existing callers still use it; deletion happens in a later cleanup plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in the project (callers missing `userId` in DB inserts) are unrelated to this plan — they exist in files that will be fixed in subsequent plans 03-02 through 03-05.

## Next Phase Readiness

- `requireAuth()` is ready for use in all server action refactors (plans 03-02 to 03-05)
- TypeScript types provide compile-time safety when narrowing auth results
- No blockers

---

_Phase: 03-server-actions-refactor_
_Completed: 2026-02-24_
