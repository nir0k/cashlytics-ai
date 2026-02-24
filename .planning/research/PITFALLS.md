# Pitfalls Research

**Domain:** Auth.js v5 Migration to Multi-User Architecture  
**Project:** Cashlytics (Next.js 16 + Drizzle ORM + PostgreSQL)  
**Researched:** 2026-02-24  
**Confidence:** HIGH (Official Auth.js docs + codebase analysis)

---

## Critical Pitfalls

Mistakes that cause data loss, security breaches, or major rewrites.

### Pitfall 1: Orphaned Data During Migration

**What goes wrong:**  
When adding `userId` FK columns to existing tables, existing rows become orphaned (NULL userId). After the migration, queries filtered by `userId` return empty results, making all existing data "disappear" for the original user.

**Why it happens:**  
Developers add the `userId` column as nullable, run the migration, but forget to backfill existing rows with the single-user's ID before switching to user-filtered queries.

**How to avoid:**

```sql
-- WRONG: Just add column
ALTER TABLE accounts ADD COLUMN user_id UUID;

-- RIGHT: Add column, backfill, then enforce
ALTER TABLE accounts ADD COLUMN user_id UUID REFERENCES users(id);
UPDATE accounts SET user_id = '<single-user-id-from-env>' WHERE user_id IS NULL;
-- Then make NOT NULL in a second migration
```

**Warning signs:**

- Dashboard shows zero accounts after migration
- "No data found" errors on pages that previously worked
- Seed data exists in DB but queries return empty

**Phase to address:** Migration Phase (Phase 2)

---

### Pitfall 2: Middleware-Only Security (Missing Query-Level Filtering)

**What goes wrong:**  
Developers rely solely on middleware/proxy to protect routes, but server actions bypass middleware and directly query the database without user filtering. User A can access User B's data by calling server actions directly.

**Why it happens:**  
Next.js middleware runs before page routes, but **server actions are not protected by middleware**. They're separate endpoints that must validate auth independently.

**How to avoid:**

```typescript
// WRONG: Only middleware protection
export const proxy = auth((req) => {
  if (!req.auth) return Response.redirect("/login");
});

// Server action still vulnerable:
export async function getAccounts() {
  return db.select().from(accounts); // Returns ALL accounts!
}

// RIGHT: Every server action filters by userId
export async function getAccounts() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.select().from(accounts).where(eq(accounts.userId, session.user.id));
}
```

**Warning signs:**

- Server actions don't call `auth()` or check session
- No `userId` in WHERE clauses
- Middleware config exists but actions lack auth checks

**Phase to address:** Auth Implementation (Phase 1) + Every subsequent phase

---

### Pitfall 3: Missing Session in Server Actions

**What goes wrong:**  
Server actions are called but `auth()` returns null/undefined because the session cookie isn't being passed correctly, causing all authenticated operations to fail silently or throw.

**Why it happens:**  
In Next.js App Router, server actions need the session to be passed via cookies. If `auth()` is called without the proper context, it can't read the session cookie.

**How to avoid:**

```typescript
// Use the auth() export from your auth.ts config file
import { auth } from "@/auth";

export async function createAccount(data: CreateAccountInput) {
  const session = await auth();

  // Always check for session first
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Now use session.user.id
  const [account] = await db
    .insert(accounts)
    .values({ ...data, userId: session.user.id })
    .returning();

  return { success: true, data: account };
}
```

**Warning signs:**

- `session` is null in server actions
- "Unauthorized" errors on valid logged-in requests
- Auth works in pages but fails in server actions

**Phase to address:** Auth Implementation (Phase 1)

---

### Pitfall 4: Database Session Strategy + Edge Incompatibility

**What goes wrong:**  
Using `strategy: "database"` with Drizzle adapter causes proxy/middleware to fail because PostgreSQL connections aren't Edge-compatible. The app crashes or auth fails in production.

**Why it happens:**  
Auth.js v5 defaults to `database` strategy when an adapter is configured. But Drizzle's PostgreSQL adapter requires Node.js runtime, not Edge runtime.

**How to avoid:**

```typescript
// auth.ts - Split configuration for Edge compatibility
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./lib/db";
import authConfig from "./auth.config";

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" }, // Force JWT for Edge compatibility
  ...authConfig,
});
```

**Warning signs:**

- `TypeError: Cannot read properties of undefined` in proxy
- Edge runtime errors in production logs
- Auth works locally (Node.js) but fails deployed

**Phase to address:** Auth Implementation (Phase 1)

---

### Pitfall 5: Race Condition in Multi-Request Token Refresh

**What goes wrong:**  
If implementing OAuth with refresh tokens, concurrent requests can race to refresh an expired token, causing one request to use an invalidated refresh token.

**Why it happens:**  
Refresh tokens are typically single-use. When multiple tabs/requests detect an expired token simultaneously, they all try to refresh, but only the first succeeds.

**How to avoid:**

- For Cashlytics (credentials-only), this is NOT applicable
- If OAuth is added later, implement token locking or background refresh

**Phase to address:** Only if OAuth is added (Out of Scope for this milestone)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut                        | Immediate Benefit              | Long-term Cost                        | When Acceptable                           |
| ------------------------------- | ------------------------------ | ------------------------------------- | ----------------------------------------- |
| Nullable `userId` columns       | Faster migration, no data copy | Orphaned data, inconsistent state     | Never - always backfill in same migration |
| Skip auth in "internal" actions | Faster development             | Security hole when called from client | Never - all server actions must auth      |
| Use `any` for session type      | Faster initial setup           | Runtime errors, no type safety        | Never                                     |
| Single shared categories table  | Simpler schema                 | Users see each other's categories     | Never - each user needs own categories    |
| Trust middleware for all auth   | Less code duplication          | Server action vulnerability           | Never                                     |

---

## Integration Gotchas

Common mistakes when connecting Auth.js with Drizzle + Next.js 16.

| Integration               | Common Mistake                              | Correct Approach                                                     |
| ------------------------- | ------------------------------------------- | -------------------------------------------------------------------- |
| **Drizzle Adapter**       | Forgetting to add Auth.js tables to schema  | Include `users`, `sessions`, `accounts`, `verificationTokens` tables |
| **Proxy (Middleware)**    | Using `middleware.ts` instead of `proxy.ts` | Next.js 16 renamed middleware to proxy                               |
| **Server Actions**        | Assuming `auth()` works without cookies     | Import `auth` from config file, it handles cookies automatically     |
| **Environment Variables** | Using `NEXTAUTH_` prefix                    | Auth.js v5 uses `AUTH_` prefix (e.g., `AUTH_SECRET`)                 |
| **Cookie Prefix**         | Expecting `next-auth.` cookies              | Auth.js v5 uses `authjs.` prefix                                     |
| **TypeScript Types**      | Using `NextAuthOptions`                     | Renamed to `NextAuthConfig` in v5                                    |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap                                | Symptoms                       | Prevention                                               | When It Breaks        |
| ----------------------------------- | ------------------------------ | -------------------------------------------------------- | --------------------- |
| **N+1 queries per user**            | Slow dashboard with many users | Batch user data fetches, use JOINs                       | 100+ concurrent users |
| **Session DB lookup per request**   | High DB load, slow auth        | Use JWT strategy instead of database                     | 1000+ requests/min    |
| **Unindexed userId FK**             | Slow queries as data grows     | Add index on all `userId` columns                        | 10K+ rows per table   |
| **Full table scan for user filter** | Queries without userId index   | `CREATE INDEX idx_accounts_user_id ON accounts(user_id)` | 10K+ rows             |

---

## Security Mistakes

Domain-specific security issues for multi-user financial apps.

| Mistake                                      | Risk                                                  | Prevention                                                  |
| -------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| **ID enumeration**                           | User guesses other IDs to access data                 | Use UUIDs (already done), validate ownership in every query |
| **Missing ownership check on update/delete** | User can modify/delete other users' data              | Always include `userId` in WHERE clause for mutations       |
| **Unvalidated foreign key relationships**    | User creates expense linked to another user's account | Verify `accountId` belongs to current user before insert    |
| **Client-side only validation**              | Malicious requests bypass UI validation               | Validate all inputs in server actions, never trust client   |
| **Session fixation**                         | Attacker forces victim's session ID                   | Auth.js handles this, but don't disable session rotation    |
| **Insecure password storage**                | Passwords leaked in breach                            | Auth.js uses bcrypt by default - never override             |

---

## UX Pitfalls

Common user experience mistakes when adding authentication.

| Pitfall                          | User Impact                                 | Better Approach                                            |
| -------------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| **Losing session on tab open**   | User logged out unexpectedly                | Ensure cookie settings allow session persistence           |
| **No feedback on auth failure**  | User doesn't know why action failed         | Return specific error messages from server actions         |
| **Redirect loops**               | User stuck between login and protected page | Check if already authenticated before redirecting to login |
| **Breaking single-user mode**    | Existing users lose data                    | Migration must assign existing data to configured user     |
| **Categories reset on new user** | New users have no categories                | Seed default categories for new users                      |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Auth Setup:** API routes exist but server actions lack auth — verify every action calls `auth()`
- [ ] **Migration:** Columns added but data not backfilled — check for NULL userId in production
- [ ] **Row Security:** Middleware protects pages but not server actions — test API calls directly
- [ ] **Foreign Keys:** userId FK exists but not validated on insert — test creating with another user's accountId
- [ ] **Session:** Login works but session lost on refresh — verify cookie settings and AUTH_SECRET
- [ ] **Types:** TypeScript compiles but session.user.id undefined — extend Session type in declarations
- [ ] **Demo Data:** seed-demo.sql updated for multi-user — verify all rows have userId

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall                        | Recovery Cost | Recovery Steps                                            |
| ------------------------------ | ------------- | --------------------------------------------------------- |
| Orphaned data (NULL userId)    | LOW           | Run UPDATE to backfill with single-user ID                |
| Missing auth in server actions | MEDIUM        | Add auth() call to each action, test thoroughly           |
| Wrong session strategy         | LOW           | Change to `strategy: "jwt"` in auth config                |
| Missing indexes on userId      | LOW           | CREATE INDEX CONCURRENTLY in production                   |
| Session type errors            | LOW           | Add proper TypeScript declarations                        |
| Leaked data between users      | CRITICAL      | Full audit of all queries + potential breach notification |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall                    | Prevention Phase     | Verification                              |
| -------------------------- | -------------------- | ----------------------------------------- |
| Orphaned data migration    | Phase 2: Migration   | Query for NULL userId after migration     |
| Middleware-only security   | Phase 1: Auth Setup  | Test server action without session cookie |
| Missing session in actions | Phase 1: Auth Setup  | Console.log session in each action        |
| Edge incompatibility       | Phase 1: Auth Setup  | Deploy and test proxy                     |
| Missing userId indexes     | Phase 2: Migration   | EXPLAIN ANALYZE with user filter          |
| Foreign key validation     | Phase 3: Data Access | Test creating with other user's account   |
| TypeScript types           | Phase 1: Auth Setup  | tsc --noEmit passes                       |

---

## Codebase-Specific Findings

From analysis of existing Cashlytics code:

### Current State (Pre-Migration)

- **47 database queries** across 18 action files
- **8 tables** need `userId` FK: `accounts`, `expenses`, `incomes`, `daily_expenses`, `transfers`, `categories`, `documents`, `conversations`
- **Zero auth checks** in any server action
- **Zero userId columns** in schema
- **Demo seed data** has 3 accounts, 12 categories, 10 expenses, 3 incomes, 2 transfers, 55+ daily expenses

### Critical Files Requiring Updates

```
src/lib/db/schema.ts          # Add userId to all tables
src/actions/accounts-actions.ts
src/actions/expenses-actions.ts
src/actions/income-actions.ts
src/actions/daily-expenses-actions.ts
src/actions/transfer-actions.ts
src/actions/category-actions.ts
src/actions/document-actions.ts
src/actions/conversation-actions.ts
src/actions/dashboard-actions.ts
src/actions/analytics-actions.ts
src/actions/forecast-actions.ts
scripts/seed-demo.sql         # Add userId to all inserts
```

### Pattern to Apply (Example)

```typescript
// Before (current)
export async function getAccounts() {
  return db.select().from(accounts);
}

// After (with auth)
export async function getAccounts() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }
  return db.select().from(accounts).where(eq(accounts.userId, session.user.id));
}
```

---

## Sources

- Auth.js v5 Migration Guide: https://authjs.dev/getting-started/migrating-to-v5
- Auth.js Drizzle Adapter: https://authjs.dev/getting-started/adapters/drizzle
- Auth.js Session Strategies: https://authjs.dev/concepts/session-strategies
- Auth.js Protecting Resources: https://authjs.dev/getting-started/session-management/protecting
- Auth.js Adapters Reference: https://authjs.dev/reference/core/adapters
- Codebase analysis: 18 action files, schema.ts, seed-demo.sql

---

_Pitfalls research for: Cashlytics Multi-User Auth Migration_  
_Researched: 2026-02-24_
