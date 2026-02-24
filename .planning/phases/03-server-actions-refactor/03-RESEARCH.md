# Phase 3: Server Actions Refactor - Research

**Researched:** 2026-02-24
**Domain:** Next.js Server Actions authorization + Drizzle ORM userId filtering
**Confidence:** HIGH

## Summary

Phase 3 adds per-user data isolation to all server actions. The infrastructure is already in place from Phases 1 and 2: Auth.js v5 is configured with JWT sessions, `auth()` is importable from `@/auth` (alias in tsconfig.json), and all 8 data tables have `userId NOT NULL` FK columns. The `user-id.ts` temporary placeholder (`getCurrentUserId`) is itself already calling `auth()` with a fallback to `SINGLE_USER_EMAIL` — this is the wrapper that needs to be replaced by a proper `requireAuth` helper that throws/returns unauthorized for unauthenticated calls instead of falling through.

The key architectural insight from analyzing the existing code: **partial work has already been done**. Most CREATE operations already call `getCurrentUserId()` and inject `userId` into inserts. What's missing is: (1) a proper `requireAuth` helper that returns an `{ error, unauthorized }` response instead of throwing on missing sessions, (2) SELECT/UPDATE/DELETE queries scoped by `userId`, and (3) FK validation for cross-entity references (e.g., verifying `accountId` belongs to the authenticated user before creating an expense).

There are **two sets of actions** — singular (account-actions.ts, expense-actions.ts, etc.) and plural (accounts-actions.ts, expenses-actions.ts, etc.). The plural set is the primary UI-facing one and is more complete. Both must be refactored. Additionally there are `analytics-actions.ts`, `dashboard-actions.ts`, `account-detail-actions.ts`, `search-actions.ts`, `forecast-actions.ts` that have NO userId filtering at all and need full refactoring.

**Primary recommendation:** Create `src/lib/auth/require-auth.ts` with a `requireAuth()` helper that calls `auth()` and returns a typed `{ error: "Unauthorized", status: 401 }` sentinel. All actions use this helper at the top, fail fast if no session, and append `eq(table.userId, userId)` to every query.

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                | Research Support                                                                                          |
| -------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| AUTHZ-02 | Server Actions verifizieren Session vor jeder Mutation                     | `requireAuth()` pattern — call `auth()` at top of each mutating action, return unauthorized if no session |
| AUTHZ-03 | Server Actions verifizieren Session vor jedem Lesezugriff                  | Same `requireAuth()` pattern applied to all SELECT-returning actions                                      |
| DATA-01  | Alle Queries filtern nach userId aus Session                               | Add `eq(table.userId, userId)` to every SELECT, UPDATE, DELETE where clause                               |
| DATA-10  | FK-Validierung: User kann nur eigene Accounts/Categories in Queries nutzen | Before inserting expense/income/etc., verify accountId and categoryId belong to the authenticated user    |

</phase_requirements>

## Standard Stack

### Core

| Library     | Version                   | Purpose                                             | Why Standard                                                              |
| ----------- | ------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| next-auth   | 5.0.0-beta.30 (installed) | `auth()` session access                             | Already configured; `@/auth` alias in tsconfig resolves to root `auth.ts` |
| drizzle-orm | 0.45.1 (installed)        | ORM with `eq`, `and` operators for userId filtering | Already in use; `eq(table.userId, userId)` is the filter pattern          |
| next/cache  | Next.js 15 built-in       | `revalidatePath()` for cache invalidation           | Already used in all actions                                               |

### No New Packages Required

All dependencies needed for Phase 3 are already installed. This phase is pure refactoring of existing TypeScript files.

## Architecture Patterns

### Recommended File Structure

```
src/
├── lib/
│   └── auth/
│       ├── password.ts         # (existing) bcrypt utilities
│       ├── user-id.ts          # (existing, TEMPORARY) getCurrentUserId fallback
│       └── require-auth.ts     # (NEW) requireAuth helper — core of Phase 3
├── actions/
│   ├── accounts-actions.ts     # (refactor) plural — primary UI actions
│   ├── account-actions.ts      # (refactor) singular — legacy, also needs userId
│   ├── expenses-actions.ts     # (refactor) plural
│   ├── expense-actions.ts      # (refactor) singular
│   ├── incomes-actions.ts      # (refactor) plural
│   ├── income-actions.ts       # (refactor) singular
│   ├── daily-expenses-actions.ts  # (refactor)
│   ├── transfer-actions.ts     # (refactor)
│   ├── category-actions.ts     # (refactor)
│   ├── document-actions.ts     # (refactor)
│   ├── conversation-actions.ts # (refactor)
│   ├── analytics-actions.ts    # (refactor — no userId at all currently)
│   ├── dashboard-actions.ts    # (refactor — no userId at all currently)
│   ├── account-detail-actions.ts  # (refactor — no userId at all currently)
│   ├── search-actions.ts       # (refactor — no userId at all currently)
│   └── forecast-actions.ts     # (refactor — no userId at all currently)
└── app/
    └── api/
        └── documents/
            └── route.ts        # (refactor — GET endpoint leaks all documents)
```

### Pattern 1: requireAuth Helper

**What:** Centralized session check that returns a typed error response for unauthenticated calls
**When to use:** Top of every server action, before any DB query
**Example:**

```typescript
// src/lib/auth/require-auth.ts
"use server";

import { auth } from "@/auth";

export type AuthResult =
  | { userId: string; error?: never }
  | { userId?: never; error: "Unauthorized" };

export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }
  return { userId: session.user.id };
}
```

### Pattern 2: Action with Auth Guard (Read)

**What:** SELECT action guarded by requireAuth with userId filter on query
**When to use:** Every action that reads data

```typescript
// Example: accounts-actions.ts
"use server";

import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import type { ApiResponse, Account } from "@/types/database";

export async function getAccounts(): Promise<ApiResponse<Account[]>> {
  const authResult = await requireAuth();
  if (authResult.error) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const allAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, authResult.userId)) // KEY: filter by userId
      .orderBy(desc(accounts.createdAt));

    return { success: true, data: allAccounts };
  } catch (error) {
    logger.error("Failed to fetch accounts", "getAccounts", error);
    return { success: false, error: "Konten konnten nicht geladen werden." };
  }
}
```

### Pattern 3: Action with Auth Guard (Mutation) + FK Validation

**What:** INSERT/UPDATE/DELETE guarded by requireAuth, with FK validation for cross-entity refs
**When to use:** Every mutating action, especially those referencing accountId or categoryId

```typescript
// Example: expenses-actions.ts createExpense
export async function createExpense(data: { ... }): Promise<ApiResponse<Expense>> {
  const authResult = await requireAuth();
  if (authResult.error) {
    return { success: false, error: "Unauthorized" };
  }
  const { userId } = authResult;

  try {
    // FK Validation: verify accountId belongs to this user (DATA-10)
    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, data.accountId), eq(accounts.userId, userId)))
      .limit(1);

    if (!account) {
      return { success: false, error: "Konto nicht gefunden oder kein Zugriff." };
    }

    // Optional FK Validation for categoryId
    if (data.categoryId) {
      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, data.categoryId), eq(categories.userId, userId)))
        .limit(1);

      if (!category) {
        return { success: false, error: "Kategorie nicht gefunden oder kein Zugriff." };
      }
    }

    const [newExpense] = await db
      .insert(expenses)
      .values({ userId, ...data })
      .returning();

    revalidatePath("/expenses");
    return { success: true, data: newExpense };
  } catch (error) {
    logger.error("Failed to create expense", "createExpense", error);
    return { success: false, error: "Ausgabe konnte nicht erstellt werden." };
  }
}
```

### Pattern 4: UPDATE/DELETE with Ownership Verification

**What:** Add userId condition to UPDATE/DELETE to prevent cross-user mutation
**When to use:** Every UPDATE or DELETE operation

```typescript
// Example: deleteAccount
export async function deleteAccount(id: string): Promise<ApiResponse<void>> {
  const authResult = await requireAuth();
  if (authResult.error) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const [deleted] = await db
      .delete(accounts)
      .where(
        and(
          eq(accounts.id, id),
          eq(accounts.userId, authResult.userId)  // KEY: only delete own records
        )
      )
      .returning();

    if (!deleted) {
      return { success: false, error: "Konto nicht gefunden." };
    }

    revalidatePath("/accounts");
    return { success: true, data: undefined };
  } catch (error) { ... }
}
```

### Pattern 5: Analytics/Dashboard Actions (Read-only, userId filter needed)

**What:** Aggregate queries need userId added to every sub-query
**When to use:** `analytics-actions.ts`, `dashboard-actions.ts`, `forecast-actions.ts`

```typescript
// analytics-actions.ts example — add userId filter to every query
export async function getMonthlyOverview(month: number, year: number): Promise<...> {
  const authResult = await requireAuth();
  if (authResult.error) {
    return { success: false, error: "Unauthorized" };
  }
  const { userId } = authResult;

  // Every sub-query must filter by userId
  const expensesResult = await db
    .select(...)
    .from(expenses)
    .leftJoin(...)
    .where(
      and(
        eq(expenses.userId, userId),  // KEY: added
        lte(expenses.startDate, endDate),
        ...
      )
    );
  // Same for incomes, dailyExpenses queries
}
```

### Anti-Patterns to Avoid

- **Calling `getCurrentUserId()` in refactored code:** The temporary helper should NOT be used in final Phase 3 code. Replace all calls with `requireAuth()`.
- **Partial userId filtering:** Must add userId to ALL queries in a single action — a SELECT without userId filter is a data leak even if the parent action is guarded.
- **Not filtering analytics queries:** `analytics-actions.ts` and `dashboard-actions.ts` currently have NO auth at all — these are as critical as CRUD actions since they expose financial summaries.
- **Trusting client-supplied IDs for FK validation:** Never skip the ownership check for `accountId`/`categoryId`. Always verify both the ID exists AND it belongs to the authenticated user in the same query.
- **Throw vs return for unauthorized:** Server actions should RETURN `{ success: false, error: "Unauthorized" }` rather than throw, to avoid exposing stack traces to the client. Reserve throw only for truly unexpected errors.

## Current State Analysis

This section documents the CURRENT state of each action file so the planner knows the exact delta.

### Actions with PARTIAL auth (getCurrentUserId on mutations only, no SELECT filtering)

| File                      | Gets userId?      | SELECT filtered? | FK validated? |
| ------------------------- | ----------------- | ---------------- | ------------- |
| accounts-actions.ts       | YES (create only) | NO               | NO            |
| account-actions.ts        | YES (create only) | NO               | NO            |
| expenses-actions.ts       | YES (create only) | NO               | NO            |
| expense-actions.ts        | YES (create only) | NO               | NO            |
| incomes-actions.ts        | YES (create only) | NO               | NO            |
| income-actions.ts         | YES (create only) | NO               | NO            |
| daily-expenses-actions.ts | YES (create only) | NO               | NO            |
| transfer-actions.ts       | YES (create only) | NO               | NO            |
| category-actions.ts       | YES (create only) | NO               | NO            |
| document-actions.ts       | YES (upload only) | NO               | NO            |
| conversation-actions.ts   | YES (create only) | NO               | NO            |

### Actions with NO auth at all

| File                               | Issue                                  |
| ---------------------------------- | -------------------------------------- |
| analytics-actions.ts               | No auth, no userId filter on ANY query |
| dashboard-actions.ts               | No auth, no userId filter on ANY query |
| account-detail-actions.ts          | No auth, no userId filter on ANY query |
| search-actions.ts                  | No auth, returns all users' data       |
| forecast-actions.ts                | No auth, no userId filter on ANY query |
| src/app/api/documents/route.ts GET | Returns all documents from all users   |

## Don't Hand-Roll

| Problem           | Don't Build              | Use Instead                                    | Why                                                             |
| ----------------- | ------------------------ | ---------------------------------------------- | --------------------------------------------------------------- |
| Session retrieval | Custom cookie parsing    | `auth()` from `@/auth`                         | JWT parsing, signature verification, session hydration handled  |
| Auth error types  | Custom error classes     | Simple `{ error: "Unauthorized" }` return type | Server actions return JSON — no exception propagation to client |
| userId injection  | Manual parameter passing | `requireAuth()` called inside each action      | Each action is independently callable — no context cascade      |

**Key insight:** Server actions run server-side but are callable independently. Each action must authenticate itself — there's no request middleware that can pre-populate a user context for all actions.

## Common Pitfalls

### Pitfall 1: Forgetting userId Filter on Joined Queries

**What goes wrong:** An action calls `requireAuth()` at the top but then does a JOIN query that pulls all records because the WHERE clause only has business logic filters, not `eq(table.userId, userId)`.
**Why it happens:** `analytics-actions.ts` has complex multi-condition WHERE clauses — easy to forget to add userId to one of the sub-queries in a Promise.all.
**How to avoid:** After refactoring each action, verify the query plan: every `.from(table)` call that returns user data must have `eq(table.userId, userId)` in its WHERE.
**Warning signs:** Test with two users — User B can see User A's data if filter is missing.

### Pitfall 2: getCurrentUserId() vs requireAuth() Confusion

**What goes wrong:** After Phase 3, some files still import and call `getCurrentUserId()` (the temporary placeholder in `user-id.ts`) instead of `requireAuth()`.
**Why it happens:** The old file still exists and is imported. It uses a fallback to `SINGLE_USER_EMAIL` that bypasses auth in single-user mode.
**How to avoid:** Each refactored file should remove `getCurrentUserId` import and add `requireAuth` import. At end of Phase 3, `user-id.ts` should be deleted or clearly marked deprecated.
**Warning signs:** Actions that work when no user is logged in — `getCurrentUserId` doesn't enforce auth.

### Pitfall 3: Transfer FK Validation is Two-Directional

**What goes wrong:** Transfer creation validates `sourceAccountId` but forgets `targetAccountId`.
**Why it happens:** The transfer action references two accounts. Both must belong to the authenticated user, not just the source.
**How to avoid:** Validate BOTH `sourceAccountId` and `targetAccountId` belong to `userId` before creating a transfer.
**Warning signs:** User can create transfers to another user's account by guessing their account UUID.

### Pitfall 4: Conversation/Message Isolation

**What goes wrong:** `getConversationById` and `getMessages` filter by conversation ID but not userId. User B can access User A's conversation if they know the UUID.
**Why it happens:** Messages belong to a conversation, not directly to a user. The userId check happens on the conversation, but the join to messages doesn't check it.
**How to avoid:** When fetching a conversation, verify `conversations.userId = authUserId` in the WHERE clause. The messages filter by `conversationId` which is already owned.
**Warning signs:** A UUID-guessing attack on `/api/assistant?conversationId=X` returns another user's chat.

### Pitfall 5: Analytics Actions Have Multiple Parallel Sub-Queries

**What goes wrong:** `analytics-actions.ts` functions like `getMonthlyTrend` use `Promise.all` with 3+ parallel queries. Easy to add userId to two but miss the third.
**Why it happens:** Large, complex functions with multiple independent queries.
**How to avoid:** Search each analytics function body for `.from(` — each occurrence needs `eq(table.userId, userId)` in the where clause.
**Warning signs:** Dashboard shows correct income data but incorrect expense data for a second user.

### Pitfall 6: API Route Handler Also Needs Auth

**What goes wrong:** `src/app/api/documents/route.ts` GET endpoint returns ALL documents. The POST endpoint uses `getCurrentUserId()` (not `requireAuth()`). Both need updating.
**Why it happens:** The API route isn't a Server Action — it's a Route Handler. Auth pattern is the same (`auth()` from `@/auth`) but the response format is `NextResponse.json`.
**How to avoid:** The GET handler must call `auth()` and filter by userId. The POST handler must switch to using `auth()` directly (not via `getCurrentUserId`).
**Warning signs:** `GET /api/documents` returns documents from all users.

## Code Examples

### requireAuth Helper (Full Implementation)

```typescript
// Source: Based on Auth.js v5 docs https://authjs.dev/getting-started/session-management/get-session
// src/lib/auth/require-auth.ts

import { auth } from "@/auth";

export type AuthSuccess = { userId: string; error?: never };
export type AuthFailure = { userId?: never; error: "Unauthorized" };
export type AuthResult = AuthSuccess | AuthFailure;

export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }
  return { userId: session.user.id };
}
```

Note: The `"use server"` directive is NOT needed on this file since it's a utility called from Server Actions, not a Server Action itself. The Server Actions that call it already have `"use server"` at their top.

### Drizzle userId Filter Patterns

```typescript
// Source: Drizzle ORM docs https://orm.drizzle.team/docs/select#filtering
import { eq, and } from "drizzle-orm";

// SELECT with userId filter
await db.select().from(accounts).where(eq(accounts.userId, userId));

// SELECT with userId + additional filters
await db
  .select()
  .from(expenses)
  .where(and(eq(expenses.userId, userId), gte(expenses.startDate, startDate)));

// UPDATE with userId ownership check (prevents cross-user mutations)
const [updated] = await db
  .update(accounts)
  .set(data)
  .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
  .returning();

// DELETE with userId ownership check
const [deleted] = await db
  .delete(accounts)
  .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
  .returning();

// FK Validation pattern (DATA-10)
const [owned] = await db
  .select({ id: accounts.id })
  .from(accounts)
  .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
  .limit(1);

if (!owned) {
  return { success: false, error: "Konto nicht gefunden oder kein Zugriff." };
}
```

### Route Handler Auth Pattern (for /api/documents)

```typescript
// Source: https://authjs.dev/getting-started/session-management/get-session#in-route-handlers
// src/app/api/documents/route.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await db.select().from(documents).where(eq(documents.userId, session.user.id));

  return NextResponse.json(documents);
}
```

## State of the Art

| Old Approach                                       | Current Approach                            | When Changed | Impact                                       |
| -------------------------------------------------- | ------------------------------------------- | ------------ | -------------------------------------------- |
| `getCurrentUserId()` fallback to SINGLE_USER_EMAIL | `requireAuth()` direct session check        | Phase 3      | No fallback — unauthenticated = unauthorized |
| No SELECT filtering                                | `eq(table.userId, userId)` on all queries   | Phase 3      | Data isolation enforced at DB level          |
| Implicit trust of client-supplied IDs              | FK ownership validation                     | Phase 3      | Cross-user data access prevented             |
| Actions work without session                       | Actions return Unauthorized without session | Phase 3      | AUTHZ-02, AUTHZ-03 fulfilled                 |

**After Phase 3, `user-id.ts` will be obsolete** — it exists only as a bridge. It should be deleted once all callers are updated.

## Open Questions

1. **Should `getCurrentUserId()` (user-id.ts) be deleted in Phase 3 or Phase 4?**
   - What we know: Phase 3 replaces all usages with `requireAuth()`
   - What's unclear: Whether Phase 4 (login/register actions) might need it as a bridge
   - Recommendation: Mark it deprecated at end of Phase 3, delete it in Phase 3 cleanup step (plan 03-01 should note this intent)

2. **Do analytics actions need to return Unauthorized or empty data when not authenticated?**
   - What we know: proxy.ts already redirects unauthenticated users to `/login`
   - What's unclear: Whether analytics actions can ever be called without a session in the UI flow
   - Recommendation: Return `{ success: false, error: "Unauthorized" }` consistently — proxy.ts is a defense-in-depth layer, server actions must not rely on it

3. **Should FK validation be a shared utility or inline per action?**
   - What we know: The pattern is identical: `select id where id = X and userId = Y limit 1`
   - What's unclear: Whether a `verifyOwnership(table, id, userId)` helper adds enough value
   - Recommendation: Start inline (explicit), extract to shared utility only if 4+ actions repeat identical logic

## Sources

### Primary (HIGH confidence)

- Codebase analysis: `/home/coder/cashlytics/src/actions/` — All 16 action files read in full; current state documented above
- Codebase analysis: `/home/coder/cashlytics/src/lib/auth/user-id.ts` — Confirmed `getCurrentUserId` fallback behavior
- Codebase analysis: `/home/coder/cashlytics/auth.ts` — Confirmed `auth()` available at `@/auth` alias
- Codebase analysis: `/home/coder/cashlytics/tsconfig.json` — Confirmed `@/auth` path alias pointing to `./auth.ts`
- Phase 1 Research: `/home/coder/cashlytics/.planning/phases/01-core-auth-infrastructure/01-RESEARCH.md` — Auth.js v5 session patterns
- Phase 2 Research: `/home/coder/cashlytics/.planning/phases/02-database-migration/02-RESEARCH.md` — Schema with userId on all tables

### Secondary (MEDIUM confidence)

- Auth.js v5 Session Management: https://authjs.dev/getting-started/session-management/get-session — Server Action and Route Handler patterns
- Drizzle ORM Filtering: https://orm.drizzle.team/docs/select#filtering — `eq`, `and` operator usage

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — All libraries already installed, patterns directly observed in codebase
- Architecture: HIGH — requireAuth pattern directly derived from existing auth.ts structure and Auth.js docs
- Pitfalls: HIGH — Identified from direct code analysis of all 16 action files + 1 API route

**Research date:** 2026-02-24
**Valid until:** 30 days (stable patterns — Auth.js v5 JWT session API, Drizzle eq/and operators)
