# Phase 2: Database Migration - Research

**Researched:** 2026-02-24
**Domain:** Database schema migration with Drizzle ORM, Auth.js adapter tables, data backfill
**Confidence:** HIGH

## Summary

Phase 2 adds multi-user data isolation infrastructure to Cashlytics by adding `userId` foreign keys to all 8 data tables and creating the Auth.js adapter tables. The critical challenge is avoiding orphaned data during migration — existing rows must be assigned to a single user defined by `SINGLE_USER_EMAIL` before queries filter by `userId`.

**Naming conflict:** The existing `accounts` table stores financial accounts. Auth.js expects an `accounts` table for OAuth provider linking. Solution: Use prefixed names for Auth.js tables (`auth_accounts`, `auth_sessions`, `auth_verification_tokens`) to avoid conflicts.

**Primary recommendation:** Use a two-migration approach: (1) Add nullable `userId` columns + Auth.js tables, (2) Backfill data via SQL script, (3) Make `userId` NOT NULL. This prevents migration failure on existing data.

<phase_requirements>

## Phase Requirements

| ID      | Description                                                      | Research Support                                                          |
| ------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| DATA-02 | accounts Tabelle hat userId Foreign Key                          | Standard FK pattern: `userId: uuid('user_id').references(() => users.id)` |
| DATA-03 | expenses Tabelle hat userId Foreign Key                          | Standard FK pattern with onDelete cascade                                 |
| DATA-04 | income Tabelle hat userId Foreign Key                            | Standard FK pattern with onDelete cascade                                 |
| DATA-05 | daily_expenses Tabelle hat userId Foreign Key                    | Standard FK pattern with onDelete cascade                                 |
| DATA-06 | transfers Tabelle hat userId Foreign Key                         | Standard FK pattern with onDelete cascade                                 |
| DATA-07 | categories Tabelle hat userId Foreign Key                        | Standard FK pattern with onDelete cascade                                 |
| DATA-08 | documents Tabelle hat userId Foreign Key                         | Standard FK pattern with onDelete cascade                                 |
| DATA-09 | conversations Tabelle hat userId Foreign Key                     | Standard FK pattern with onDelete cascade                                 |
| MIG-01  | Drizzle Migration für Auth.js Tabellen                           | Auth.js Drizzle adapter schema requirements documented                    |
| MIG-02  | Drizzle Migration für userId FK auf allen existierenden Tabellen | Nullable → backfill → NOT NULL pattern recommended                        |
| MIG-03  | Migration Script weist existierende Daten SINGLE_USER_EMAIL zu   | SQL UPDATE with subquery to get user ID                                   |
| MIG-04  | seed-demo.sql wird mit userId angepasst                          | sync-demo-seeder skill available for validation                           |

</phase_requirements>

## Standard Stack

### Core

| Library               | Version | Purpose                  | Why Standard                                     |
| --------------------- | ------- | ------------------------ | ------------------------------------------------ |
| drizzle-orm           | 0.45.1  | Type-safe ORM            | Already in use, migration support built-in       |
| drizzle-kit           | 0.31.9  | Migration generation     | Already in use, handles schema diffs             |
| @auth/drizzle-adapter | 1.11.1  | Auth.js database adapter | Installed in Phase 1, provides adapter interface |

### Supporting

| Library  | Version | Purpose           | When to Use                   |
| -------- | ------- | ----------------- | ----------------------------- |
| postgres | 3.4.8   | PostgreSQL client | Already in use for migrations |

### Auth.js Tables Required

| Table                      | Purpose                | Required         | Notes                                                |
| -------------------------- | ---------------------- | ---------------- | ---------------------------------------------------- |
| `users`                    | User accounts          | ✓ Already exists | Need to add `emailVerified` field                    |
| `auth_accounts`            | OAuth provider linking | Yes              | Prefixed to avoid conflict with financial `accounts` |
| `auth_sessions`            | Database sessions      | No               | Using JWT strategy, optional for future              |
| `auth_verification_tokens` | Password reset tokens  | Recommended      | Future password reset feature                        |

**Installation:** No new packages required — all dependencies installed in Phase 1.

## Architecture Patterns

### Recommended Migration Approach

```
Migration 0004: Add Auth.js tables + nullable userId columns
     ↓
Backfill Script: Create user, assign all data
     ↓
Migration 0005: Make userId NOT NULL
```

### Pattern 1: Nullable FK Column with Backfill

**What:** Add column as nullable, backfill existing data, then make NOT NULL
**When to use:** When adding FK to table with existing rows that must be preserved
**Example:**

```typescript
// Step 1: Schema change (migration 0004)
// src/lib/db/schema.ts
export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // nullable initially
  // ... other columns
});

// Step 2: Backfill script (run after migration 0004)
// scripts/migrate-add-userId.ts
const SINGLE_USER_EMAIL = process.env.SINGLE_USER_EMAIL!;

// Create the single user if not exists
const [user] = await db
  .insert(users)
  .values({
    email: SINGLE_USER_EMAIL,
    name: "Admin",
    password: await hashPassword(process.env.INITIAL_PASSWORD!),
  })
  .onConflictDoNothing()
  .returning();

const existingUser =
  user || (await db.select().from(users).where(eq(users.email, SINGLE_USER_EMAIL)).limit(1));

// Backfill all tables
await db.update(accounts).set({ userId: existingUser.id }).where(isNull(accounts.userId));
await db.update(expenses).set({ userId: existingUser.id }).where(isNull(expenses.userId));
// ... repeat for all 8 tables
```

**Source:** Standard PostgreSQL migration pattern, verified via Drizzle docs

### Pattern 2: Custom Auth.js Table Names

**What:** Pass custom table names to DrizzleAdapter to avoid naming conflicts
**When to use:** When your app has tables that conflict with Auth.js expected names
**Example:**

```typescript
// auth.ts
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db, users, authAccounts, authSessions, authVerificationTokens } from "@/lib/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: authAccounts,
    sessionsTable: authSessions,
    verificationTokensTable: authVerificationTokens,
  }),
  // ...
});
```

**Source:** https://authjs.dev/getting-started/adapters/drizzle#passing-your-own-schemas

### Pattern 3: Auth.js PostgreSQL Schema

**What:** Required table structure for Auth.js Drizzle adapter
**Example:**

```typescript
// src/lib/db/schema.ts

// Users table - extend existing
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }), // NEW - required by Auth.js
  name: text("name"),
  password: text("password"), // Custom field for credentials
  image: text("image"), // NEW - optional, for OAuth avatars
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Auth.js accounts table (OAuth provider linking)
export const authAccounts = pgTable("auth_accounts", {
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'oauth' | 'email' | 'credentials'
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

// Auth.js sessions table (for database session strategy)
export const authSessions = pgTable("auth_sessions", {
  sessionToken: text("session_token").notNull().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// Auth.js verification tokens (for magic links / password reset)
export const authVerificationTokens = pgTable("auth_verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().primaryKey(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});
```

**Source:** https://authjs.dev/reference/drizzle-adapter/lib/pg

### Anti-Patterns to Avoid

- **Adding NOT NULL FK without backfill:** Migration fails on existing rows with NULL values
- **Using `accounts` for Auth.js table:** Conflicts with existing financial accounts table
- **Forgetting to update relations:** Drizzle relations must include userId for proper joins
- **Hardcoded user IDs in seed data:** Use deterministic UUIDs like `u0000000-0000-0000-0000-000000000001`

## Don't Hand-Roll

| Problem                    | Don't Build     | Use Instead                             | Why                                     |
| -------------------------- | --------------- | --------------------------------------- | --------------------------------------- |
| Migration generation       | Custom SQL diff | `drizzle-kit generate`                  | Handles column ordering, FK constraints |
| Password hashing           | Custom crypto   | bcrypt (already installed)              | Salt rounds, timing-safe comparison     |
| User creation in migration | Raw INSERT      | Drizzle insert with onConflictDoNothing | Handles race conditions                 |

**Key insight:** Drizzle migrations are idempotent when using `drizzle-kit migrate`. Let the tool handle schema diffing.

## Common Pitfalls

### Pitfall 1: Orphaned Data After Migration

**What goes wrong:** After adding userId column, queries with `WHERE userId = X` return empty results because all rows have NULL userId
**Why it happens:** Adding nullable column sets all existing rows to NULL
**How to avoid:** Backfill script must run between nullable-column migration and NOT NULL constraint
**Warning signs:** Empty dashboards, zero balances after migration

### Pitfall 2: Auth.js Table Name Collision

**What goes wrong:** Auth.js expects `accounts` table but that's your financial accounts
**Why it happens:** Auth.js uses generic names that may conflict with domain tables
**How to avoid:** Use prefixed names (`auth_accounts`) and pass custom table config to DrizzleAdapter
**Warning signs:** "Table accounts does not have expected columns" errors from Auth.js

### Pitfall 3: Missing emailVerified Column

**What goes wrong:** Auth.js adapter expects `emailVerified` column on users table
**Why it happens:** Phase 1 created minimal users table without Auth.js standard fields
**How to avoid:** Add `emailVerified: timestamp("email_verified", { mode: "date" })` in this phase
**Warning signs:** Adapter errors about missing columns during OAuth flows

### Pitfall 4: Circular Migration Dependency

**What goes wrong:** Migration for userId FK fails because users table doesn't have required row yet
**Why it happens:** FK constraint is checked immediately when column is added
**How to avoid:** Add userId as nullable first, create user, backfill, then add NOT NULL in separate migration
**Warning signs:** "violates foreign key constraint" errors during migration

### Pitfall 5: Inconsistent seed-demo.sql

**What goes wrong:** Demo data doesn't include userId, causing NULL constraint violations
**Why it happens:** Forgetting to update seed file when adding NOT NULL constraint
**How to avoid:** Update seed-demo.sql with userId BEFORE running NOT NULL migration
**Warning signs:** Demo reset fails with constraint violations

## Code Examples

### Complete Schema Update for userId FK

```typescript
// src/lib/db/schema.ts - Updated data tables with userId FK

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // NEW
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").default("EUR").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // NEW
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id),
  // ... rest of columns
});

// Apply same pattern to: incomes, dailyExpenses, transfers, categories, documents, conversations
```

### Backfill Migration Script

```typescript
// scripts/migrate-add-userId.ts
import "dotenv/config";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  expenses,
  incomes,
  dailyExpenses,
  transfers,
  categories,
  documents,
  conversations,
} from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";

async function main() {
  const email = process.env.SINGLE_USER_EMAIL;
  const initialPassword = process.env.INITIAL_PASSWORD || "changeme";

  if (!email) {
    throw new Error("SINGLE_USER_EMAIL environment variable is required");
  }

  // 1. Create the single user if not exists
  const hashedPassword = await hashPassword(initialPassword);
  const [user] = await db
    .insert(users)
    .values({
      email,
      name: email.split("@")[0],
      password: hashedPassword,
      emailVerified: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  const singleUser =
    user ??
    (await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then((r) => r[0]));

  if (!singleUser) {
    throw new Error("Failed to get or create single user");
  }

  console.log(`Using user: ${singleUser.email} (${singleUser.id})`);

  // 2. Backfill all tables
  const tables = [
    { name: "accounts", table: accounts },
    { name: "expenses", table: expenses },
    { name: "incomes", table: incomes },
    { name: "dailyExpenses", table: dailyExpenses },
    { name: "transfers", table: transfers },
    { name: "categories", table: categories },
    { name: "documents", table: documents },
    { name: "conversations", table: conversations },
  ];

  for (const { name, table } of tables) {
    const result = await db
      .update(table)
      .set({ userId: singleUser.id })
      .where(isNull(table.userId));
    console.log(`Updated ${name}: ${result.rowCount} rows`);
  }

  console.log("Backfill complete!");
}

main().catch(console.error);
```

### Updated seed-demo.sql Pattern

```sql
-- seed-demo.sql - Updated with userId column

BEGIN;

-- First, ensure the single user exists (or use deterministic UUID)
-- User ID: u0000000-0000-0000-0000-000000000001
INSERT INTO users (id, email, name, password, email_verified, created_at)
VALUES (
  'u0000000-0000-0000-0000-000000000001',
  'demo@cashlytics.local',
  'Demo User',
  '$2b$12$...', -- bcrypt hash
  NOW(),
  NOW() - INTERVAL '180 days'
) ON CONFLICT (email) DO NOTHING;

-- ACCOUNTS (financial accounts)
INSERT INTO accounts (id, user_id, name, type, balance, currency, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'Hauptkonto', 'checking', 3245.80, 'EUR', NOW() - INTERVAL '180 days'),
  -- ... more accounts with user_id

-- CATEGORIES
INSERT INTO categories (id, user_id, name, icon, color, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'Wohnen', '🏠', '#3b82f6', NOW() - INTERVAL '180 days'),
  -- ... more categories with user_id

-- Apply same pattern to all other tables

COMMIT;
```

### Updated Relations

```typescript
// src/lib/db/schema.ts - Add user relations

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  expenses: many(expenses),
  incomes: many(incomes),
  dailyExpenses: many(dailyExpenses),
  transfers: many(transfers),
  categories: many(categories),
  documents: many(documents),
  conversations: many(conversations),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  // ... existing relations
}));
```

## State of the Art

| Old Approach                 | Current Approach                | When Changed  | Impact                           |
| ---------------------------- | ------------------------------- | ------------- | -------------------------------- |
| Manual SQL migrations        | Drizzle Kit generate            | Project start | Auto-generated diffs from schema |
| Single-migration FK addition | Two-migration nullable→NOT NULL | Best practice | Safe migrations on existing data |
| Default Auth.js table names  | Custom prefixed names           | This phase    | Avoids naming conflicts          |

**Deprecated/outdated:**

- Raw SQL migrations: Use `drizzle-kit generate` for schema-driven migrations
- Manual password hashing: Use bcrypt library (installed Phase 1)

## Open Questions

1. **Should auth_sessions table be created?**
   - What we know: Using JWT session strategy (`session: { strategy: "jwt" }`)
   - What's unclear: Whether to create table for future database sessions
   - Recommendation: Create the table but don't use it — allows switching strategies later without migration

2. **What should INITIAL_PASSWORD default to?**
   - What we know: SINGLE_USER_EMAIL is required, password must be hashed
   - What's unclear: Default password value
   - Recommendation: Use `changeme` as default, document that it should be changed immediately

3. **Should backfill be a migration or standalone script?**
   - What we know: Drizzle migrations are SQL-only
   - What's unclear: How to run TypeScript backfill logic
   - Recommendation: Standalone TypeScript script (`scripts/migrate-add-userId.ts`) that runs between migrations

## Sources

### Primary (HIGH confidence)

- Auth.js Drizzle Adapter: https://authjs.dev/getting-started/adapters/drizzle — Schema requirements, custom table config
- Auth.js PostgreSQL Schema: https://authjs.dev/reference/drizzle-adapter/lib/pg — Exact column definitions
- Drizzle Kit Migrations: https://orm.drizzle.team/kit-docs/overview — Migration workflow

### Secondary (HIGH confidence)

- Existing codebase analysis: `/home/coder/cashlytics/src/lib/db/schema.ts` — Current schema structure
- Existing migrations: `/home/coder/cashlytics/drizzle/*.sql` — Migration patterns
- Phase 1 verification: `/home/coder/cashlytics/.planning/phases/01-core-auth-infrastructure/01-VERIFICATION.md` — Current auth setup

### Project Skills

- sync-demo-seeder: `/home/coder/cashlytics/.claude/skills/sync-demo-seeder/SKILL.md` — Use after schema changes to update seed-demo.sql

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Using existing Drizzle setup, Auth.js adapter docs verified
- Architecture: HIGH - Migration pattern is standard PostgreSQL best practice
- Pitfalls: HIGH - Based on real-world migration experiences and Auth.js requirements

**Research date:** 2026-02-24
**Valid until:** 30 days (stable patterns, Auth.js v5 is mature)
