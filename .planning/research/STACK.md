# Stack Research: Auth.js v5 + Multi-User Auth

**Domain:** Authentication for existing Next.js 16 + Drizzle + PostgreSQL app
**Researched:** 2026-02-24
**Confidence:** HIGH (official docs verified)

---

## Executive Summary

Auth.js v5 (next-auth@beta) is the specified authentication solution, but a major ecosystem shift occurred in September 2025: **Auth.js joined Better Auth**. The Better Auth team continues maintaining Auth.js for existing users but recommends new projects start with Better Auth. Given the project constraint specifies Auth.js v5, this research covers that path while documenting the ecosystem context.

---

## Recommended Stack

### Core Authentication

| Package                 | Version         | Purpose             | Why                                                                                                       |
| ----------------------- | --------------- | ------------------- | --------------------------------------------------------------------------------------------------------- |
| `next-auth`             | `5.0.0-beta.30` | Auth framework      | Project constraint; v5 has App Router-first design, simplified `auth()` API, Edge compatibility           |
| `@auth/drizzle-adapter` | `1.11.1`        | Drizzle ORM adapter | Official adapter for Drizzle, works with existing `postgres.js` driver                                    |
| `bcrypt`                | `6.0.0`         | Password hashing    | Battle-tested, widely used, pure JS works in Docker. Alternative: `@node-rs/argon2` for stronger security |

### Supporting Libraries (Already in Project)

| Package       | Version  | Purpose               | Notes                                                       |
| ------------- | -------- | --------------------- | ----------------------------------------------------------- |
| `zod`         | `4.3.6`  | Credential validation | Already installed; use for email/password schema validation |
| `drizzle-orm` | `0.45.1` | ORM                   | Existing; add Auth.js tables to same schema file            |
| `postgres`    | `3.4.8`  | PostgreSQL client     | Existing; compatible with Drizzle adapter                   |

---

## Installation

```bash
# Core authentication
npm install next-auth@beta @auth/drizzle-adapter bcrypt

# TypeScript types for bcrypt
npm install -D @types/bcrypt
```

**Alternative (argon2 for stronger security):**

```bash
npm install @node-rs/argon2  # Native Rust bindings, faster + stronger
# No @types needed - includes TypeScript definitions
```

---

## Auth.js v5 Architecture for This Project

### File Structure

```
src/
├── auth.ts                    # Auth.js v5 config (NEW)
├── app/api/auth/[...nextauth]/
│   └── route.ts               # Route handler (NEW)
├── proxy.ts                   # Next.js 16 middleware (NEW)
└── lib/db/
    └── schema.ts              # Add users, sessions, accounts, verificationTokens tables
```

### Required Auth.js Tables (Add to schema.ts)

```typescript
// Auth.js v5 required tables for Drizzle adapter (PostgreSQL)
import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  password: text("password"), // For credentials provider
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
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

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires").notNull(),
});
```

### auth.ts Configuration (Credentials Provider)

```typescript
// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" }, // JWT for credentials; database sessions also work
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const { email, password } = await signInSchema.parseAsync(credentials);

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user?.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/login", // Custom login page
  },
});
```

### Route Handler (Next.js 16 App Router)

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

### Proxy (Next.js 16 Middleware)

```typescript
// src/proxy.ts (middleware.ts in Next.js < 16)
export { auth as proxy } from "@/auth";

// Optional: Protect routes
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
```

---

## Integration with Existing Schema

### Add userId to Existing Tables

Each table needs a `userId` foreign key:

```typescript
// Add to existing tables in schema.ts
export const accounts = pgTable("accounts", {
  // ... existing fields
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
});

// Same for: expenses, incomes, transfers, categories, conversations, documents, daily_expenses
```

### Migration Strategy

1. Create Auth.js tables (`users`, `accounts`, `sessions`, `verificationTokens`)
2. Add `userId` column to all existing tables (nullable first)
3. Create default user from `.env` configuration
4. Assign existing data to default user
5. Make `userId` non-nullable

---

## What NOT to Use

| Avoid                              | Why                                                         | Use Instead                    |
| ---------------------------------- | ----------------------------------------------------------- | ------------------------------ |
| `next-auth@4.x`                    | Legacy, requires Pages Router patterns, no unified `auth()` | `next-auth@beta` (v5)          |
| `@next-auth/drizzle-adapter`       | Deprecated package name                                     | `@auth/drizzle-adapter`        |
| `getServerSession()`               | v4 pattern, replaced in v5                                  | `auth()` from config file      |
| `next-auth/middleware`             | v4 pattern, renamed in Next.js 16                           | `auth as proxy` export         |
| Storing plaintext passwords        | Security vulnerability                                      | bcrypt or argon2               |
| JWT strategy with database adapter | Credentials provider works best with JWT strategy           | `session: { strategy: 'jwt' }` |

---

## Alternatives Considered

| Recommended  | Alternative       | When to Use Alternative                                                                               |
| ------------ | ----------------- | ----------------------------------------------------------------------------------------------------- |
| Auth.js v5   | **Better Auth**   | New projects without Auth.js constraint; Better Auth has more features, better DX, active development |
| Auth.js v5   | Clerk/Auth0       | If you want hosted auth, don't want to manage passwords/sessions                                      |
| bcrypt       | @node-rs/argon2   | Stronger security (Argon2 winner of PHC), faster; requires native compilation                         |
| JWT sessions | Database sessions | If you need session revocation, audit trails, or multi-device management                              |

---

## Critical Ecosystem Context: Better Auth

**Important:** In September 2025, Auth.js joined [Better Auth](https://better-auth.com). Implications:

1. **Auth.js continues to be maintained** - Security patches and urgent issues will be addressed
2. **New projects should consider Better Auth** - Recommended by the Auth.js team themselves
3. **Migration path exists** - [Better Auth migration guide](https://www.better-auth.com/docs/guides/next-auth-migration-guide) available
4. **Given project constraint** - Use Auth.js v5 as specified; can migrate to Better Auth later if desired

---

## Version Compatibility Matrix

| Package               | Version       | Compatible With   | Notes                                           |
| --------------------- | ------------- | ----------------- | ----------------------------------------------- |
| next-auth             | 5.0.0-beta.30 | Next.js 14+       | App Router-first, requires Node 18+             |
| @auth/drizzle-adapter | 1.11.1        | drizzle-orm 0.29+ | Works with postgres, pg, and other drivers      |
| drizzle-orm           | 0.45.1        | postgres 3.x      | Already in project                              |
| bcrypt                | 6.0.0         | Node 18+          | Pure JS, Docker-friendly                        |
| @node-rs/argon2       | 2.0.2         | Node 18+          | Native bindings, may need build tools in Docker |

---

## Docker Considerations

The project uses Docker deployment. Key notes:

1. **bcrypt** (recommended): Pure JavaScript, no native dependencies, works out of the box
2. **@node-rs/argon2**: Requires native compilation; ensure Dockerfile has build tools:
   ```dockerfile
   RUN apk add --no-cache python3 make g++
   ```
3. **AUTH_SECRET**: Generate with `npx auth secret` and add to `.env`
4. **AUTH_TRUST_HOST**: Set to `true` when behind reverse proxy

---

## Sources

| Source                                                                                                 | What Verified                                 | Confidence |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ---------- |
| [authjs.dev/installation](https://authjs.dev/getting-started/installation)                             | Package names, v5 setup pattern               | HIGH       |
| [authjs.dev/adapters/drizzle](https://authjs.dev/getting-started/adapters/drizzle)                     | Drizzle adapter config, schema                | HIGH       |
| [authjs.dev/authentication/credentials](https://authjs.dev/getting-started/authentication/credentials) | Credentials provider setup, password handling | HIGH       |
| [authjs.dev/migrating-to-v5](https://authjs.dev/getting-started/migrating-to-v5)                       | v4→v5 changes, proxy.ts naming                | HIGH       |
| [better-auth.com/blog](https://better-auth.com/blog/authjs-joins-better-auth)                          | Ecosystem context, maintenance status         | HIGH       |
| npm registry                                                                                           | Exact version numbers                         | HIGH       |

---

_Stack research for: Auth.js v5 + Drizzle + PostgreSQL_
_Researched: 2026-02-24_
