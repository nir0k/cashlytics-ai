# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** Jeder User sieht nur seine eigenen Finanzdaten — sicher isoliert auf Database- und Middleware-Ebene.
**Current focus:** Phase 2: Database Migration

## Current Position

Phase: 2 of 5 (Database Migration)
Plan: 4 of 4 in current phase
Status: In Progress
Last activity: 2026-02-24 — Completed 02-04 (Demo Data Seeder Sync)

Progress: [█████████░] 90%

## Performance Metrics

**Velocity:**

- Total plans completed: 5
- Average duration: 11 min
- Total execution time: 0.9 hours

**By Phase:**

| Phase                       | Plans | Total | Avg/Plan |
| --------------------------- | ----- | ----- | -------- |
| 1. Core Auth Infrastructure | 3     | 3     | 7 min    |
| 2. Database Migration       | 3     | 4     | 16 min   |
| 3. Server Actions Refactor  | 0     | 5     | -        |
| 4. Auth UI Components       | 0     | 4     | -        |
| 5. Registration Mode Logic  | 0     | 3     | -        |

**Recent Trend:**

- Last 5 plans: 02-04 (5 min), 02-02 (23 min), 02-01 (21 min), 01-03 (5 min), 01-02 (3 min)
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

### Pending Todos

None yet.

### Blockers/Concerns

None - Migration 0004 applied successfully.

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 02-04-PLAN.md (Demo Data Seeder Sync)
Resume file: None
