# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** Jeder User sieht nur seine eigenen Finanzdaten — sicher isoliert auf Database- und Middleware-Ebene.
**Current focus:** Phase 2: Database Migration

## Current Position

Phase: 2 of 5 (Database Migration)
Plan: 1 of 4 in current phase
Status: In Progress
Last activity: 2026-02-24 — Completed 02-01 (Auth.js adapter tables)

Progress: [███████░░░] 70%

## Performance Metrics

**Velocity:**

- Total plans completed: 4
- Average duration: 10 min
- Total execution time: 0.7 hours

**By Phase:**

| Phase                       | Plans | Total | Avg/Plan |
| --------------------------- | ----- | ----- | -------- |
| 1. Core Auth Infrastructure | 3     | 3     | 7 min    |
| 2. Database Migration       | 1     | 4     | 21 min   |
| 3. Server Actions Refactor  | 0     | 5     | -        |
| 4. Auth UI Components       | 0     | 4     | -        |
| 5. Registration Mode Logic  | 0     | 3     | -        |

**Recent Trend:**

- Last 5 plans: 02-01 (21 min), 01-03 (5 min), 01-02 (3 min), 01-01 (14 min)
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

### Pending Todos

None yet.

### Blockers/Concerns

- Migration 0004 needs to be run when database is available (Docker not running during execution)

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 02-01-PLAN.md (Auth.js adapter tables)
Resume file: None
