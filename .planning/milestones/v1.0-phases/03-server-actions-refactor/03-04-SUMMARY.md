---
phase: 03-server-actions-refactor
plan: "04"
subsystem: auth
tags: [requireAuth, drizzle-orm, server-actions, route-handler, userId-isolation]

# Dependency graph
requires:
  - phase: 03-01
    provides: requireAuth helper with discriminated union AuthResult type
  - phase: 02-database-migration
    provides: userId columns on transfers, conversations, documents tables
provides:
  - Transfer CRUD with bidirectional FK validation (sourceAccountId AND targetAccountId)
  - Conversation CRUD with userId isolation (UUID-guessing prevention)
  - Document CRUD with userId scoping on all operations
  - GET /api/documents — authenticated, returns only user's documents
  - POST /api/documents — auth() guard before rate limiting and body parse
affects:
  - 03-05
  - 04-auth-ui-components
  - any future features using transfer/conversation/document data

# Tech tracking
tech-stack:
  added: []
  patterns:
    - requireAuth at top of every server action before any DB query
    - Bidirectional FK validation for transfers (both account ownership checks)
    - Conversation ownership check before saveMessage/getMessages (not just ID filter)
    - Route handlers use auth() directly (not requireAuth) with NextResponse.json
    - Auth-first pattern: auth check before input validation in route handlers

key-files:
  created: []
  modified:
    - src/actions/transfer-actions.ts
    - src/actions/conversation-actions.ts
    - src/actions/document-actions.ts
    - src/app/api/documents/route.ts

key-decisions:
  - "transfer-actions bidirectional FK validation: both sourceAccountId and targetAccountId validated against accounts.userId before transaction"
  - "updateTransfer/deleteTransfer return error instead of throw when transfer not found (avoids stack trace exposure)"
  - "saveMessage/getMessages verify conversation ownership before acting (prevents message injection into other users' conversations)"
  - "Route handler /api/documents uses auth() directly, not requireAuth — route handlers return NextResponse not ApiResponse"
  - "Auth check placed before rate limiting in POST /api/documents (fail fast)"

patterns-established:
  - "Server actions: requireAuth() at top, destructure userId, scope all WHERE clauses"
  - "Route handlers: const session = await auth() + if (!session?.user?.id) return NextResponse 401"
  - "Ownership verification pattern: select {id} with userId filter before mutating child resources"

requirements-completed: [AUTHZ-02, AUTHZ-03, DATA-01, DATA-10]

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 3 Plan 04: Transfer, Conversation, Document Actions Refactor Summary

**requireAuth and userId-scoped WHERE clauses added to transfer/conversation/document actions, with bidirectional FK validation on transfers and ownership checks before message operations**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-24T~14:13Z
- **Completed:** 2026-02-24T~14:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- transfer-actions.ts: requireAuth guard, userId always in getTransfers conditions, bidirectional FK validation in createTransfer (both source and target accounts must belong to user), userId-scoped WHERE on updateTransfer and deleteTransfer
- conversation-actions.ts: requireAuth on all 8 functions, userId filter on getConversations, AND-condition on getConversationById/updateConversationTitle/deleteConversation, ownership check before saveMessage and getMessages
- document-actions.ts: requireAuth auth-first on all functions, userId scoping on deleteDocument/getDocumentsByExpense/getDocumentsByDailyExpense/downloadDocument/getAllDocuments
- /api/documents route.ts: auth() guard in GET (returns 401 + user-scoped query) and POST (auth before rate limiting, userId from session)

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor transfer-actions.ts with bidirectional FK validation** - `4d7fb18` (feat)
2. **Task 2: Refactor conversation-actions.ts and document-actions.ts + route handler** - `ba36019` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/actions/transfer-actions.ts` - requireAuth, userId conditions, bidirectional FK validation
- `src/actions/conversation-actions.ts` - requireAuth on all functions, ownership checks before message ops
- `src/actions/document-actions.ts` - requireAuth auth-first, userId scoping on all queries
- `src/app/api/documents/route.ts` - auth() direct in GET and POST, removed getCurrentUserId

## Decisions Made

- Bidirectional FK validation in createTransfer: both sourceAccount and targetAccount lookups run separately before the transaction. A transfer where one account belongs to another user is rejected with a specific German error message.
- updateTransfer and deleteTransfer now return `{ success: false, error: "Transfer nicht gefunden." }` instead of throwing — avoids stack trace exposure in production.
- saveMessage and getMessages both verify conversation ownership (not just rely on the conversationId being correct) — prevents a user with a valid session from injecting messages into another user's conversation by knowing the UUID.
- Route handler uses `auth()` directly because `requireAuth()` returns `ApiResponse`-shaped objects, but route handlers use `NextResponse.json()`. The auth logic is equivalent but the error response format matches the route handler's NextResponse pattern.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in other files (expense-form.tsx, lib/ai/tools.ts, etc.) were confirmed out-of-scope — these are from earlier plans still in progress and not caused by our changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four files free of getCurrentUserId references
- Transfer, conversation, and document data is fully userId-isolated
- Ready for plan 03-05 (remaining server actions refactor or next phase)

---

_Phase: 03-server-actions-refactor_
_Completed: 2026-02-24_
