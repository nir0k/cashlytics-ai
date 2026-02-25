# Phase 6: Database Schema - Research

**Researched:** 2026-02-25
**Domain:** Drizzle ORM Migration — Password Reset Token Table
**Confidence:** HIGH

## Summary

This phase creates the `password_reset_tokens` table as a dedicated storage mechanism for password reset tokens. The table must store SHA-256 hashes of tokens (never raw tokens), with columns for user reference, expiry, and single-use tracking.

**Critical architectural decision:** Do NOT reuse Auth.js's `authVerificationTokens` table. That table is adapter-managed with a composite primary key `(identifier, token)` and lacks the `usedAt` column needed for single-use enforcement. Create a dedicated application-controlled table.

**Primary recommendation:** Add `passwordResetTokens` table to `src/lib/db/schema.ts`, generate migration with `npm run db:generate`, apply with `npm run db:migrate`.

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                               | Research Support                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| RESET-11 | Dedicated `password_reset_tokens` table with tokenHash, userId, expiresAt, usedAt columns | Drizzle pgTable pattern (existing schema.ts lines 38-46), FK constraint pattern (lines 51-53), timestamp pattern (line 45) |

</phase_requirements>

## Standard Stack

### Core

| Library     | Version            | Purpose                               | Why Standard                    |
| ----------- | ------------------ | ------------------------------------- | ------------------------------- |
| drizzle-orm | ^0.39.1 (existing) | ORM for PostgreSQL schema definitions | Already in use across 12 tables |
| drizzle-kit | ^0.30.4 (existing) | Migration generator                   | Project's migration toolchain   |

### Supporting

| Library                   | Version | Purpose                           | When to Use                               |
| ------------------------- | ------- | --------------------------------- | ----------------------------------------- |
| crypto (Node.js built-in) | N/A     | SHA-256 hashing for token storage | Phase 9 (token utilities), not this phase |

**No new packages required** — this phase uses existing Drizzle toolchain.

## Architecture Patterns

### Recommended Table Schema

Based on existing patterns in `src/lib/db/schema.ts` and security requirements:

```typescript
// src/lib/db/schema.ts — ADD after authVerificationTokens (around line 85)

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Column rationale:**

| Column      | Type                                                                   | Rationale                                                                                |
| ----------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `id`        | `uuid().defaultRandom().primaryKey()`                                  | Matches existing pattern (users, accounts, etc.)                                         |
| `tokenHash` | `text().notNull().unique()`                                            | SHA-256 hash (64 hex chars). Unique constraint prevents duplicate tokens. NOT raw token. |
| `userId`    | `uuid().notNull().references(() => users.id, { onDelete: "cascade" })` | FK to users table. Cascade delete removes tokens when user is deleted.                   |
| `expiresAt` | `timestamp().notNull()`                                                | Expiry timestamp for 1-hour validity (RESET-04)                                          |
| `usedAt`    | `timestamp()`                                                          | Nullable — set when token is consumed for single-use enforcement (RESET-05)              |
| `createdAt` | `timestamp().defaultNow().notNull()`                                   | Audit trail, matches all other tables                                                    |

### Pattern 1: Follow Existing Table Conventions

**What:** Match the style and conventions of existing Auth.js tables in schema.ts.

**When to use:** Always — consistency reduces cognitive load and prevents migration issues.

**Example from existing schema (users table, lines 38-46):**

```typescript
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  name: text("name"),
  password: text("password"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Apply this pattern:**

- Use `uuid("id").defaultRandom().primaryKey()` for primary key
- Use snake_case for SQL column names (second argument): `token_hash`, `user_id`, `expires_at`
- Use `timestamp("column_name")` for all datetime fields
- Foreign keys use `.references(() => users.id, { onDelete: "cascade" })`

### Pattern 2: Migration Generation Workflow

**What:** Use Drizzle Kit to introspect schema changes and generate SQL migration.

**When to use:** After any schema.ts modification.

**Example:**

```bash
# After editing schema.ts
npm run db:generate

# This creates drizzle/0006_<random_name>.sql with:
# CREATE TABLE "password_reset_tokens" (...)
# CREATE UNIQUE INDEX ... ON "password_reset_tokens" ("token_hash")

# Apply to database
npm run db:migrate
```

### Anti-Patterns to Avoid

- **Reusing `authVerificationTokens`:** That table is Auth.js adapter-managed. Its schema lacks `usedAt` and uses composite PK `(identifier, token)`. Mixing custom logic with adapter tables creates maintenance risk.
- **Using `token` column name:** Name it `tokenHash` or `token_hash` to make it explicit this is a hash, not the raw token. Prevents accidental exposure in logs/debugging.
- **Missing `onDelete: "cascade"`:** Without this, deleting a user fails if they have reset tokens.

## Don't Hand-Roll

| Problem            | Don't Build               | Use Instead                      | Why                                                              |
| ------------------ | ------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| SQL migration file | Manual `CREATE TABLE` SQL | `npm run db:generate`            | Drizzle Kit handles column types, constraints, indexes correctly |
| Index creation     | Manual `CREATE INDEX`     | `.unique()` on column definition | Drizzle generates appropriate unique index automatically         |

**Key insight:** Drizzle's type-safe schema definitions + auto-generated migrations prevent schema drift and ensure TypeScript/SQL consistency.

## Common Pitfalls

### Pitfall 1: Wrong Column Name Convention

**What goes wrong:** Using camelCase for SQL column names (`tokenHash` instead of `token_hash`)
**Why it happens:** TypeScript uses camelCase, easy to forget SQL uses snake_case
**How to avoid:** Always use snake_case in the second argument: `text("token_hash")`
**Warning signs:** Migration has camelCase column names

### Pitfall 2: Missing Foreign Key Constraint

**What goes wrong:** `userId` column without `.references()` — no referential integrity
**Why it happens:** Forgetting the FK definition, just using `uuid("user_id").notNull()`
**How to avoid:** Copy the pattern from existing tables: `.references(() => users.id, { onDelete: "cascade" })`
**Warning signs:** Orphaned tokens remain after user deletion

### Pitfall 3: Nullable `expiresAt`

**What goes wrong:** `expiresAt` allows NULL — tokens never expire
**Why it happens:** Copying nullable pattern from `usedAt` without thinking
**How to avoid:** `expiresAt: timestamp("expires_at").notNull()` — expiry is mandatory
**Warning signs:** Migration shows `expires_at TIMESTAMP` without `NOT NULL`

### Pitfall 4: Migration Not Applied to Demo Database

**What goes wrong:** Migration runs locally but demo Docker database is out of sync
**Why it happens:** Demo uses separate database container
**How to avoid:** Run `npm run db:migrate` with appropriate DATABASE_URL, or rebuild demo container
**Warning signs:** Demo app crashes on startup with "relation does not exist"

## Code Examples

### Schema Addition (Exact Placement)

```typescript
// src/lib/db/schema.ts
// ADD AFTER authVerificationTokens table (after line 84)

// Password reset tokens (custom flow, NOT Auth.js managed)
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Expected Migration Output

```sql
-- drizzle/0006_<random_name>.sql
CREATE TABLE "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "token_hash" text NOT NULL,
  "user_id" uuid NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_unique" ON "password_reset_tokens" ("token_hash");
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
```

## State of the Art

| Old Approach          | Current Approach            | When Changed      | Impact                         |
| --------------------- | --------------------------- | ----------------- | ------------------------------ |
| Manual SQL migrations | Drizzle Kit auto-generation | Project inception | Type-safe schema, no SQL drift |

**Deprecated/outdated:**

- Raw SQL files for migrations: Drizzle Kit generates from TypeScript schema

## Open Questions

1. **Should we add an index on `userId`?**
   - What we know: Queries will filter by `userId` to invalidate all tokens on password change (RESET-10)
   - What's unclear: Is the automatic FK index sufficient for typical query patterns?
   - Recommendation: Start without explicit index. Add if performance issues arise. FK columns often get implicit indexes in PostgreSQL.

2. **Should we add `tokenHash` to relational queries?**
   - What we know: No relations defined yet
   - What's unclear: Will we need `user.passwordResetTokens` in Drizzle relational queries?
   - Recommendation: Defer relations until Phase 9. Tokens are queried directly, not through user relation.

## Related Skills

**sync-demo-seeder:** After migration, check if `scripts/seed-demo.sql` needs updating.

For this phase: `password_reset_tokens` stores transient reset tokens (not demo data). The table should NOT be added to the TRUNCATE statement or seeded with demo rows. Reset tokens are short-lived and user-specific.

## Sources

### Primary (HIGH confidence)

- Existing codebase: `src/lib/db/schema.ts` — direct inspection of 12 existing tables, patterns verified
- Drizzle ORM pg-table docs: https://orm.drizzle.team/docs/index#create-a-table
- Drizzle Kit migrations: https://orm.drizzle.team/docs/migrations

### Secondary (MEDIUM confidence)

- `.planning/research/ARCHITECTURE.md` — architecture research with schema recommendation (2026-02-25)
- `.planning/research/SUMMARY.md` — milestone research summary

### Tertiary (contextual)

- OWASP Forgot Password Cheat Sheet — security best practices for token storage

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — using existing Drizzle toolchain, no new packages
- Architecture: HIGH — direct codebase analysis, patterns from 12 existing tables
- Pitfalls: HIGH — common Drizzle/PostgreSQL patterns, well-documented

**Research date:** 2026-02-25
**Valid until:** Stable — Drizzle ORM patterns are mature

---

_Research complete. Ready for planning._
