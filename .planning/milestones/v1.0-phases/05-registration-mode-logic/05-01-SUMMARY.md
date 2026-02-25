---
phase: 05-registration-mode-logic
plan: "01"
subsystem: auth
tags: [single-user-mode, registration, env-var, drizzle, server-action]

# Dependency graph
requires:
  - phase: 04-auth-ui-components
    provides: registerAction and RegisterForm already wired up, AuthActionState.error rendered
  - phase: 01-core-auth-infrastructure
    provides: users table in Drizzle schema, db client
provides:
  - isRegistrationOpen() utility that gates registrations via SINGLE_USER_MODE env var
  - registerAction now returns error state when registration is blocked
affects: [future-registration-ui, admin-panel, docker-deployment-docs]

# Tech tracking
tech-stack:
  added: []
  patterns: [env-var-strict-string-compare, drizzle-count-int-cast, utility-not-server-action]

key-files:
  created:
    - src/lib/auth/registration-mode.ts
  modified:
    - src/actions/auth-actions.ts

key-decisions:
  - "SINGLE_USER_MODE compared with === 'true' not truthy check — 'false' string is truthy"
  - "count(*)::int cast mandatory — without it Drizzle returns string and count > 0 silently fails"
  - "registration-mode.ts has no 'use server' directive — it is a utility not a Server Action"
  - "Guard fires before Zod parse and all DB queries — fail fast without unnecessary work"
  - "SINGLE_USER_EMAIL not used here — it is data-migration attribution only, not a registration whitelist"

patterns-established:
  - "Pattern: env var gate — compare process.env.VAR === 'true', never truthy check on string"
  - "Pattern: Drizzle COUNT — always use sql<number>`count(*)::int` for correct numeric typing"

requirements-completed: [MODE-01, MODE-02, MODE-03, MODE-04]

# Metrics
duration: 1min
completed: 2026-02-25
---

# Phase 5 Plan 01: Registration Mode Logic Summary

**SINGLE_USER_MODE guard implemented via isRegistrationOpen() utility that queries user count with count(\*)::int cast, blocking registration in registerAction before Zod parse when mode is active and a user exists**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-25T08:13:02Z
- **Completed:** 2026-02-25T08:14:10Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src/lib/auth/registration-mode.ts` — pure utility (no "use server") that reads SINGLE_USER_MODE env var and queries user count
- Added SINGLE_USER_MODE guard to `registerAction` as its first async operation before any validation or DB writes
- Strict `=== "true"` comparison prevents false positives when env var is set to "false"
- `count(*)::int` PostgreSQL cast ensures numeric comparison never silently fails due to string return

## Task Commits

Each task was committed atomically:

1. **Task 1: Create isRegistrationOpen() utility** - `ec5d207` (feat)
2. **Task 2: Add SINGLE_USER_MODE guard to registerAction** - `c280689` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/lib/auth/registration-mode.ts` - isRegistrationOpen() async utility, reads SINGLE_USER_MODE, queries users count with ::int cast
- `src/actions/auth-actions.ts` - import added, mode gate inserted as first block in registerAction body

## Decisions Made

- Guard placed before Zod parse (fail fast pattern — no validation work done if registration is entirely blocked)
- No "use server" on registration-mode.ts — it is a shared utility imported by Server Actions, not itself a Server Action
- SINGLE_USER_EMAIL intentionally excluded — MODE-02 is only for data migration attribution; registration blocking is user-count-based

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Set `SINGLE_USER_MODE=true` in `.env` or Docker environment to activate the guard.

## Next Phase Readiness

- Registration mode guard is complete and TypeScript-verified
- registerAction will block registration and surface `state.error` to RegisterForm when mode is active
- Remaining plans in phase 05 can proceed (environment variable documentation, end-to-end verification)

---

_Phase: 05-registration-mode-logic_
_Completed: 2026-02-25_
