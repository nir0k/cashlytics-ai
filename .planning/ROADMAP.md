# Roadmap: Cashlytics Multi-User Auth

## Overview

This roadmap transforms Cashlytics from a single-user self-hosted finance app into a secure multi-user application. The journey starts with Auth.js infrastructure and route protection, then migrates the database schema for user isolation, refactors all server actions to filter by user, adds the login/register UI, and finally implements registration mode control for single-user vs multi-user deployments.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Core Auth Infrastructure** - Install and configure Auth.js v5 with Drizzle adapter, implement route protection via proxy.ts
- [ ] **Phase 2: Database Migration** - Add userId FK to all tables, migrate existing data to single user
- [ ] **Phase 3: Server Actions Refactor** - Update all server actions to verify session and filter by userId
- [ ] **Phase 4: Auth UI Components** - Build login/register pages with session provider integration
- [ ] **Phase 5: Registration Mode Logic** - Implement SINGLE_USER_MODE env var control

## Phase Details

### Phase 1: Core Auth Infrastructure

**Goal**: Authentication primitives exist and route protection is active
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-03, AUTH-05, AUTHZ-01, INFRA-01, INFRA-02, INFRA-03, INFRA-05, INFRA-06, INFRA-07
**Plans**: 3 plans in 3 waves

**Success Criteria** (what must be TRUE):

1. Auth.js v5 is configured with Drizzle adapter and JWT session strategy
2. Unauthenticated requests to protected routes redirect to /login
3. Session type includes user.id for use in server actions
4. Docker build succeeds with all auth dependencies

Plans:

- [x] 01-01: Install and configure Auth.js v5 with Drizzle adapter — Wave 1
- [ ] 01-02: Implement proxy.ts route protection — Wave 2 (depends on 01-01)
- [ ] 01-03: Verify Docker build and configure AUTH_SECRET — Wave 3 (depends on 01-01, 01-02)

### Phase 2: Database Migration

**Goal**: All data tables support multi-user isolation with existing data assigned to single user
**Depends on**: Phase 1
**Requirements**: DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, MIG-01, MIG-02, MIG-03, MIG-04
**Plans**: 4 plans in 2 waves

**Success Criteria** (what must be TRUE):

1. All 8 data tables have userId FK column (nullable during migration, NOT NULL after backfill)
2. All existing rows are assigned to the user defined by SINGLE_USER_EMAIL
3. Auth.js tables (users, accounts, sessions, verificationTokens) exist in schema
4. seed-demo.sql includes userId for all demo data records

Plans:

- [ ] 02-01-PLAN.md — Add Auth.js schema tables (auth_accounts, auth_sessions, auth_verification_tokens) with prefixed names — Wave 1
- [ ] 02-02-PLAN.md — Add nullable userId FK to all 8 data tables — Wave 1
- [ ] 02-03-PLAN.md — Backfill existing data to SINGLE_USER_EMAIL user, make userId NOT NULL — Wave 2 (depends on 02-01, 02-02)
- [ ] 02-04-PLAN.md — Update seed-demo.sql with userId values — Wave 2 (depends on 02-01)

### Phase 3: Server Actions Refactor

**Goal**: All data access is filtered by authenticated user with FK validation
**Depends on**: Phase 2
**Requirements**: AUTHZ-02, AUTHZ-03, DATA-01, DATA-10
**Plans**: 5 plans in 3 waves

**Success Criteria** (what must be TRUE):

1. Every server action calls auth() and returns unauthorized if no session
2. All SELECT queries filter by userId from session
3. All INSERT operations include userId from session
4. User cannot create records referencing another user's accounts or categories

Plans:

- [ ] 03-01-PLAN.md — Create requireAuth helper utility and deprecate user-id.ts — Wave 1
- [ ] 03-02-PLAN.md — Refactor accounts-actions.ts, account-actions.ts, category-actions.ts with userId filtering — Wave 2 (depends on 03-01)
- [ ] 03-03-PLAN.md — Refactor expense, income, and daily-expense actions with userId filtering and FK validation — Wave 2 (depends on 03-01)
- [ ] 03-04-PLAN.md — Refactor transfer, conversation, document actions and /api/documents route handler — Wave 2 (depends on 03-01)
- [ ] 03-05-PLAN.md — Refactor analytics, dashboard, account-detail, search, forecast actions — Wave 3 (depends on 03-02, 03-03, 03-04)

### Phase 4: Auth UI Components

**Goal**: Users can register, login, and logout through a complete UI flow
**Depends on**: Phase 3
**Requirements**: AUTH-01, AUTH-02, AUTH-04, AUTH-06, AUTH-07, INFRA-04
**Plans**: TBD

**Success Criteria** (what must be TRUE):

1. User can navigate to /register and create account with email/password
2. User can navigate to /login and authenticate with email/password
3. User stays logged in across browser refreshes (session persistence)
4. User can logout and is redirected to login page
5. SessionProvider makes session available to all client components

Plans:

- [ ] 04-01: Create login page with form and server action
- [ ] 04-02: Create register page with form and server action
- [ ] 04-03: Add SessionProvider to root layout
- [ ] 04-04: Implement logout functionality in navigation

### Phase 5: Registration Mode Logic

**Goal**: Registration behavior is controlled by environment configuration
**Depends on**: Phase 4
**Requirements**: MODE-01, MODE-02, MODE-03, MODE-04
**Plans**: TBD

**Success Criteria** (what must be TRUE):

1. SINGLE_USER_MODE=true prevents new registrations after first user exists
2. SINGLE_USER_MODE=false allows any visitor to register
3. SINGLE_USER_EMAIL defines which email owns migrated data in single-user mode
4. App functions correctly with both mode configurations

Plans:

- [ ] 05-01: Implement SINGLE_USER_MODE check in registration flow
- [ ] 05-02: Add SINGLE_USER_EMAIL validation and error handling
- [ ] 05-03: Test both modes and update documentation

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase                       | Plans Complete | Status      | Completed |
| --------------------------- | -------------- | ----------- | --------- |
| 1. Core Auth Infrastructure | 1/3            | In progress | -         |
| 2. Database Migration       | 0/4            | Not started | -         |
| 3. Server Actions Refactor  | 1/5            | In Progress |           |
| 4. Auth UI Components       | 0/4            | Not started | -         |
| 5. Registration Mode Logic  | 0/3            | Not started | -         |

---

_Roadmap created: 2026-02-24_
