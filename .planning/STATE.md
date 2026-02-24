# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** Jeder User sieht nur seine eigenen Finanzdaten — sicher isoliert auf Database- und Middleware-Ebene.
**Current focus:** Phase 4: Auth UI Components

## Current Position

Phase: 4 of 5 (Auth UI Components)
Plan: 4 of 4 in current phase (awaiting human-verify checkpoint)
Status: In progress
Last activity: 2026-02-24 — Completed 04-04 logout button; awaiting checkpoint verification

Progress: [████████████] 65% (3/5 phases, 1/4 plans in phase 4)

## Performance Metrics

**Velocity:**

- Total plans completed: 12
- Average duration: 8 min
- Total execution time: 1.1 hours

**By Phase:**

| Phase                       | Plans | Total | Avg/Plan |
| --------------------------- | ----- | ----- | -------- |
| 1. Core Auth Infrastructure | 3     | 3     | 7 min    |
| 2. Database Migration       | 4     | 4     | 12 min   |
| 3. Server Actions Refactor  | 5     | 5     | 4 min    |
| 4. Auth UI Components       | 0     | 4     | -        |
| 5. Registration Mode Logic  | 0     | 3     | -        |

**Recent Trend:**

- Last 5 plans: 03-05 (8 min), 03-04 (4 min), 03-02 (3 min), 03-01 (2 min), 02-04 (5 min)
- Trend: Stable
  | Phase 04 P01 | 2 | 3 tasks | 3 files |
  | Phase 04 P04 | 5 | 1 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: 5-phase structure derived from requirements (Auth.js setup → Schema migration → Actions refactor → UI → Mode logic)
- 01-01: JWT sessions required for Edge compatibility with proxy.ts (Next.js 16)
- 01-01: bcrypt@6.0.0 pure JS for Docker-friendly builds
- 01-01: Minimal users table added to schema to enable auth.ts compilation
- 01-02: proxy.ts follows Next.js 16 naming convention (renamed from middleware.ts)
- 01-02: Negative lookahead matcher excludes /api/auth, static assets, and public pages
- 01-03: Full app service added to docker-compose.yml (not just AUTH_SECRET) since app service was missing
- 02-01: Prefixed Auth.js tables with 'auth\_' to avoid conflict with financial accounts table
- 02-01: Composite primary key (identifier, token) for auth_verification_tokens per Auth.js spec
- [Phase 02-database-migration]: userId columns are nullable to allow existing data migration before backfill
- [Phase 02-database-migration]: Cascade delete on userId FK ensures user data is removed when user is deleted
- 02-04: Demo user uses deterministic UUID (u0000000-0000-0000-0000-000000000001) for consistent testing
- 03-01: requireAuth() has no SINGLE_USER_EMAIL fallback — unauthenticated always returns { error: "Unauthorized" }
- 03-01: AuthResult uses never-based discriminated union for correct TypeScript narrowing of userId to string
- 03-01: No "use server" on require-auth.ts — utility function imported by actions, not a Server Action itself
- [Phase 03-02]: compound AND(id, userId) WHERE for UPDATE/DELETE prevents cross-user mutation without extra ownership query
- [Phase 03-02]: requireAuth() replaces getCurrentUserId() in all account/category actions — no SINGLE_USER_EMAIL fallback
- [03-03]: FK validation on accountId/categoryId in all expense/income create operations — prevents cross-user account attachment via UUID guessing
- [03-03]: userId always first in conditions array (not conditionally pushed) to guarantee filter is never accidentally omitted
- [03-03]: Balance reversal queries in delete are internal accounting ops — accountId already FK-validated so no extra userId filter needed
- [03-04]: transfer bidirectional FK validation — both sourceAccountId and targetAccountId verified against accounts.userId before transaction
- [03-04]: updateTransfer/deleteTransfer return error instead of throw when transfer not found (avoids stack trace exposure)
- [03-04]: saveMessage/getMessages verify conversation ownership before acting (UUID-guessing prevention)
- [03-04]: Route handler /api/documents uses auth() directly, not requireAuth — route handlers return NextResponse not ApiResponse
- [03-05]: search-actions.ts returns empty array on auth failure (graceful UX degradation)
- [03-05]: forecast-actions.ts returns error on auth failure (explicit feedback for forecast)
- [03-05]: All 5 search queries scoped to userId (accounts, expenses, dailyExpenses, incomes, transfers)
- [Phase 04-01]: redirect() placed after try/catch block — NEXT_REDIRECT errors cannot be caught inside try/catch
- [Phase 04-01]: signIn() called with redirect:false to prevent Auth.js from internally throwing NEXT_REDIRECT, then redirect manually
- [Phase 04-01]: SessionProvider wraps outermost Providers layer so useSession() is available to all client components
- [Phase 04]: form action={logoutAction} pattern used in client component — avoids onClick handlers, correct server action calling convention

### Pending Todos

None yet.

### Key Decisions (04-01)

- redirect() placed after try/catch block — NEXT_REDIRECT errors cannot be caught inside try/catch
- signIn() called with redirect:false to prevent Auth.js from internally throwing NEXT_REDIRECT
- registerAction auto-logins after successful registration, falls back to /login redirect on AuthError
- SessionProvider wraps outermost layer of Providers, making session available to all client components

### Blockers/Concerns

None - Migration 0004 applied successfully.

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 04-04 task 1; dev server running; awaiting human-verify checkpoint for full auth round-trip
Resume file: None
