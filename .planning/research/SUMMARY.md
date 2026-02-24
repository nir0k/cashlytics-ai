# Project Research Summary

**Project:** Cashlytics Multi-User Authentication
**Domain:** Self-Hosted Financial Application Authentication
**Researched:** 2026-02-24
**Confidence:** HIGH

## Executive Summary

Cashlytics is a self-hosted personal finance application being upgraded from single-user to multi-user architecture using Auth.js v5. Self-hosted financial apps like Firefly III and Actual Budget establish clear authentication baselines: email/password credentials, session management, and strict data isolation are non-negotiable. The recommended approach uses Auth.js v5 with the Drizzle adapter, JWT sessions for Edge compatibility, and bcrypt for password hashing.

The critical differentiator for this project is **Registration Mode Control** — enabling single-user self-hosted deployments (where only one admin user exists, defined by environment variables) while supporting future multi-user SaaS scenarios. This requires careful migration of existing data to the single configured user.

**Key risks:** Orphaned data during migration (existing data becomes invisible after userId filtering), middleware-only security (server actions bypass route protection), and forgetting userId on database inserts. All are preventable with proper migration scripts and query-level authorization in every server action.

## Key Findings

### Recommended Stack

Auth.js v5 (next-auth@beta) is the specified authentication framework, though an important ecosystem shift occurred in September 2025: Auth.js joined Better Auth. The team continues maintaining Auth.js for existing users, so this remains the correct choice given project constraints. JWT sessions are recommended over database sessions for Edge compatibility with Next.js 16's proxy layer.

**Core technologies:**

- **next-auth@5.0.0-beta.30** — Auth framework; v5 has App Router-first design, unified `auth()` API, Edge-compatible
- **@auth/drizzle-adapter@1.11.1** — Drizzle ORM adapter; works with existing postgres.js driver
- **bcrypt@6.0.0** — Password hashing; pure JS, Docker-friendly. Alternative: @node-rs/argon2 for stronger security
- **zod@4.3.6** — Already installed; use for credential validation

**Important:** Next.js 16 renamed `middleware.ts` to `proxy.ts`. Auth.js v5 uses `AUTH_` prefix for env vars (not `NEXTAUTH_`).

### Expected Features

Self-hosted financial apps have a clear feature hierarchy. MVP must include table stakes; differentiators can be added incrementally after core auth is validated.

**Must have (table stakes):**

- Email/Password Authentication — every self-hosted app has this; it's the baseline
- Secure Password Hashing (bcrypt/argon2) — financial data requires strong security
- Session Persistence — users expect to stay logged in between visits
- Protected Routes — unauthenticated users can't access financial data
- Row-Level Data Isolation — each user sees only their own accounts/expenses
- Registration Mode Control — SINGLE_USER_MODE + SINGLE_USER_EMAIL from .env
- Logout Functionality — basic expectation

**Should have (add after MVP):**

- Password Reset Flow — users will lock themselves out
- 2FA (TOTP) — financial data warrants extra security
- Login Rate Limiting — prevent brute force attacks

**Defer (v2+):**

- OAuth Providers — convenience, not security; adds external dependency
- Magic Link Auth — requires email service
- Passkeys/WebAuthn — cutting edge, low adoption currently
- RBAC / Team features — explicitly out of scope per PROJECT.md

### Architecture Approach

The architecture follows a 5-layer model: Proxy Layer (route protection) → Presentation Layer (pages) → Authentication Layer (auth.ts + API routes) → Data Access Layer (server actions with userId filtering) → Database Layer (Drizzle + PostgreSQL). The critical pattern is **Query-Level Row Isolation**: every server action must call `auth()` and filter all queries by `session.user.id`. Middleware-only protection is insufficient because server actions bypass middleware.

**Major components:**

1. **auth.ts (root)** — Central Auth.js config, exports `auth()`, `handlers`, `signIn`, `signOut`
2. **proxy.ts (root)** — Next.js 16 middleware replacement; uses `authorized` callback for route protection
3. **Server Actions (15+ files)** — All must add session check + userId filter on every query
4. **DrizzleAdapter** — Persists Auth.js data; requires 4 new tables (users, accounts, sessions, verificationTokens)
5. **Schema Changes** — 8 existing tables need `userId` FK: accounts, expenses, incomes, daily_expenses, transfers, categories, documents, conversations

### Critical Pitfalls

1. **Orphaned Data During Migration** — When adding userId columns, existing rows become orphaned (NULL userId). After migration, queries filtered by userId return empty. **Prevention:** Add column, backfill all rows with single-user ID from env, then make NOT NULL in second migration.

2. **Middleware-Only Security** — Server actions are NOT protected by middleware. User A can access User B's data by calling server actions directly. **Prevention:** Every server action must call `auth()` and filter queries by `session.user.id`.

3. **Missing userId on Inserts** — Adding userId filter to reads but forgetting on writes creates orphaned records. **Prevention:** Every insert must include `userId: session.user.id`.

4. **Database Session Strategy + Edge Incompatibility** — Using `strategy: "database"` with Drizzle causes proxy to fail (PostgreSQL isn't Edge-compatible). **Prevention:** Use `session: { strategy: "jwt" }` in auth config.

5. **Unvalidated Foreign Keys** — User creates expense linked to another user's account. **Prevention:** Verify accountId belongs to current user before insert.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Core Auth Infrastructure

**Rationale:** Foundation for all other work. Without auth primitives, no other phase can proceed.
**Delivers:** Working login/logout, protected routes, session management
**Addresses:** Email/Password Auth, Session Persistence, Protected Routes, Logout
**Avoids:** Middleware-only security pitfall (pattern established from start)
**Stack:** next-auth@beta, @auth/drizzle-adapter, bcrypt

### Phase 2: Database Migration

**Rationale:** Must happen before data access layer changes. Adds userId to all tables.
**Delivers:** Multi-user schema, migrated existing data assigned to single user
**Addresses:** Row-Level Data Isolation infrastructure
**Avoids:** Orphaned data pitfall (backfill in same migration)
**Uses:** Drizzle migrations, data migration script

### Phase 3: Server Actions Refactor

**Rationale:** With schema ready, update all 15+ server actions to filter by userId.
**Delivers:** Query-level row isolation on all data access
**Addresses:** Row-Level Data Isolation (enforcement)
**Avoids:** Missing session in actions, missing userId on inserts
**Implements:** Auth helper utilities (requireAuth, unauthorizedResponse)

### Phase 4: Auth UI Components

**Rationale:** With backend ready, add login/register pages and session provider.
**Delivers:** User-facing authentication flow
**Addresses:** Login/Register Pages, SessionProvider integration
**Uses:** React components, server actions for form handling

### Phase 5: Registration Mode Logic

**Rationale:** Final piece — control who can register based on SINGLE_USER_MODE flag.
**Delivers:** Single-user vs multi-user mode switching
**Addresses:** Registration Mode Control
**Configuration:** SINGLE_USER_MODE, SINGLE_USER_EMAIL env vars

### Phase Ordering Rationale

- **Phase 1 first:** Auth primitives must exist before any protected functionality
- **Phase 2 before Phase 3:** Schema changes must precede query modifications
- **Phase 3 before Phase 4:** Data access must be secure before exposing UI
- **Phase 4 before Phase 5:** Basic auth flow must work before mode-specific logic
- **Phase 5 last:** Configuration layer depends on all underlying auth working

### Research Flags

Phases likely needing deeper research during planning:

- **None identified** — All phases have well-documented patterns from official Auth.js docs

Phases with standard patterns (skip research-phase):

- **Phase 1:** Well-documented Auth.js v5 setup, official Drizzle adapter docs
- **Phase 2:** Standard Drizzle migration patterns, backfill SQL is straightforward
- **Phase 3:** Repetitive pattern (auth check + userId filter), apply to 15+ files
- **Phase 4:** Standard Next.js App Router forms + Auth.js signIn/signOut
- **Phase 5:** Simple env var checks, conditional registration logic

## Confidence Assessment

| Area         | Confidence | Notes                                                                                |
| ------------ | ---------- | ------------------------------------------------------------------------------------ |
| Stack        | HIGH       | Official Auth.js docs verified, exact versions confirmed in npm registry             |
| Features     | HIGH       | Competitor analysis (Firefly III, Actual Budget) + PROJECT.md constraints align      |
| Architecture | HIGH       | Official Auth.js v5 patterns + existing codebase analysis (18 action files)          |
| Pitfalls     | HIGH       | Common Auth.js migration issues well-documented, codebase-specific analysis complete |

**Overall confidence:** HIGH

### Gaps to Address

No significant gaps identified. Research was comprehensive:

- Official Auth.js documentation covered all setup patterns
- Existing codebase fully analyzed (18 action files, schema.ts, seed-demo.sql)
- Competitor feature analysis confirms scope decisions
- Ecosystem context (Better Auth merger) noted for future consideration

Minor items to validate during implementation:

- **seed-demo.sql update:** Will need userId added to all INSERT statements (use sync-demo-seeder skill)
- **TypeScript Session type:** May need to extend Session interface to include `user.id` (standard Auth.js pattern)

## Sources

### Primary (HIGH confidence)

- Auth.js v5 Installation: https://authjs.dev/getting-started/installation — Package names, v5 setup pattern
- Auth.js Drizzle Adapter: https://authjs.dev/getting-started/adapters/drizzle — Schema requirements, adapter config
- Auth.js Credentials Provider: https://authjs.dev/getting-started/authentication/credentials — Email/password auth pattern
- Auth.js Session Strategies: https://authjs.dev/concepts/session-strategies — JWT vs database trade-offs
- Auth.js Protecting Resources: https://authjs.dev/getting-started/session-management/protecting — Route protection patterns
- Auth.js v5 Migration: https://authjs.dev/getting-started/migrating-to-v5 — v4→v5 changes, proxy.ts naming

### Secondary (HIGH confidence)

- Better Auth Blog: https://better-auth.com/blog/authjs-joins-better-auth — Ecosystem context, maintenance status
- Firefly III GitHub: https://github.com/firefly-iii/firefly-iii — Self-hosted auth patterns, 2FA feature reference
- Actual Budget GitHub: https://github.com/actualbudget/actual — Local-first auth, minimal scope reference
- npm registry — Exact version numbers verified

### Codebase Analysis (HIGH confidence)

- `/home/coder/cashlytics/src/lib/db/schema.ts` — Current schema structure
- `/home/coder/cashlytics/src/actions/*.ts` — 18 action files requiring auth updates
- `/home/coder/cashlytics/scripts/seed-demo.sql` — Demo data requiring userId migration
- `/home/coder/cashlytics/PROJECT.md` — Project constraints and scope decisions

---

_Research completed: 2026-02-24_
_Ready for roadmap: yes_
