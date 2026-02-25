# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** Jeder User sieht nur seine eigenen Finanzdaten — sicher isoliert auf Database- und Middleware-Ebene.
**Current focus:** Phase 5: Registration Mode Logic

## Current Position

Phase: 5 of 5 (Registration Mode Logic)
Plan: 1 of 3 — in progress
Status: In Progress
Last activity: 2026-02-25 — 05-01 complete: SINGLE_USER_MODE registration guard implemented

Progress: [████████████████] 80% (4/5 phases complete)

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
| 4. Auth UI Components       | 4     | 4     | ~5 min   |
| 5. Registration Mode Logic  | 1     | 3     | 1 min    |

**Recent Trend:**

- Last 5 plans: 05-01 (1 min), 04-04 (5 min), 04-03 (5 min), 04-02 (5 min), 04-01 (5 min)
- Trend: Stable

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
- [04-02]: SubmitButton extracted as separate component — useFormStatus must be used inside a component rendered within <form>
- [04-02]: (auth) route group layout completely separate from dashboard layout — no sidebar/header at /login
- [04-02]: brightness-0 invert Tailwind filter inverts dark logo SVG for display on dark (#08080a) left panel
- [Phase 04]: form action={logoutAction} pattern used in client component — avoids onClick handlers, correct server action calling convention
- [04-03]: RegisterForm mirrors LoginForm — SubmitButton extracted as child component inside form so useFormStatus works correctly
- [04-03]: confirmPassword inline error driven by registerSchema Zod validation; duplicate email error shown as fieldErrors.email
- [04-debug]: proxy.ts must be in src/ (not project root) — Watchpack only watches getPossibleMiddlewareFilenames(appDir/..) = src/ when app uses src/ layout
- [04-debug]: export function proxy() required — named function declaration, not export const or export default
- [04-debug]: getToken needs secureCookie:true when Auth.js uses \_\_Secure- cookie prefix; detect via x-forwarded-proto header or request.nextUrl.protocol
- [04-debug]: next dev --webpack required — Turbopack PostCSS IPC worker crashes with Tailwind v4 @tailwindcss/postcss on this environment
- [04-debug]: proxy matcher must exclude static file extensions (.svg, .png, .ico) — Next.js serves public/ files at root level without /public/ prefix
- [05-01]: SINGLE_USER_MODE compared with === 'true' not truthy check — 'false' string is truthy
- [05-01]: count(\*)::int cast mandatory in Drizzle — without it COUNT returns string and numeric comparison silently fails
- [05-01]: registration-mode.ts has no 'use server' directive — utility imported by Server Actions, not itself a Server Action
- [05-01]: Guard fires before Zod parse — fail fast without validation work when registration is entirely blocked

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 05-registration-mode-logic/05-01-PLAN.md
Resume file: None
