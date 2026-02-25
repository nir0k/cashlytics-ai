# Phase 1: Core Auth Infrastructure - Research

**Researched:** 2026-02-24
**Domain:** Auth.js v5 Authentication with Drizzle ORM
**Confidence:** HIGH

## Summary

Phase 1 establishes the authentication foundation for Cashlytics by installing and configuring Auth.js v5 with the Drizzle adapter. The key technical considerations are: (1) Auth.js v5 is designed for Next.js App Router with a unified `auth()` API, (2) Next.js 16 renamed `middleware.ts` to `proxy.ts` which runs on Edge Runtime, requiring JWT sessions instead of database sessions, (3) TypeScript module augmentation is required to add `user.id` to the session type for use in server actions.

The implementation follows the official Auth.js v5 patterns: a root `auth.ts` configuration file, an API route handler at `/api/auth/[...nextauth]`, and a `proxy.ts` file for route protection. Password hashing uses bcrypt (pure JavaScript, Docker-friendly). Docker builds require no changes since all dependencies are npm packages.

**Primary recommendation:** Use Auth.js v5 with JWT sessions and the official Drizzle adapter. Create `auth.ts` at project root, add the API route handler, and implement `proxy.ts` with the `authorized` callback for route protection.

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                | Research Support                                                           |
| -------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| AUTH-03  | User bleibt über Browser-Refresh eingeloggt (Session Persistenz)           | JWT sessions stored in HttpOnly cookies; automatic persistence via Auth.js |
| AUTH-05  | Passwörter werden mit bcrypt gehasht gespeichert                           | bcrypt@6.0.0 pure JS package; `hash()` and `compare()` functions           |
| AUTHZ-01 | Unauthentifizierte User werden von geschützten Routen zu /login redirected | proxy.ts with `authorized` callback; matcher config for route selection    |
| INFRA-01 | Auth.js v5 mit Drizzle Adapter konfiguriert                                | `next-auth@5.0.0-beta.30` + `@auth/drizzle-adapter@1.11.1`                 |
| INFRA-02 | proxy.ts (Next.js 16) für Route Protection                                 | Next.js 16 renamed middleware.ts → proxy.ts; export `auth as proxy`        |
| INFRA-03 | /api/auth/[...nextauth] Route Handler                                      | App Router route handler pattern; re-export GET/POST from handlers         |
| INFRA-05 | TypeScript Types für erweiterte Session (user.id)                          | Module augmentation pattern; extend Session interface in auth.ts           |
| INFRA-06 | Dockerfile angepasst (keine Änderungen nötig, nur Verification)            | All deps are npm packages; no system-level changes required                |
| INFRA-07 | docker-compose.yml angepasst (keine Änderungen nötig, nur Verification)    | Only needs AUTH_SECRET environment variable added                          |

</phase_requirements>

## Standard Stack

### Core

| Library               | Version       | Purpose             | Why Standard                                                          |
| --------------------- | ------------- | ------------------- | --------------------------------------------------------------------- |
| next-auth             | 5.0.0-beta.30 | Auth framework      | v5 has App Router-first design, unified `auth()` API, Edge-compatible |
| @auth/drizzle-adapter | 1.11.1        | Drizzle ORM adapter | Official adapter; works with existing postgres.js driver              |
| bcrypt                | 6.0.0         | Password hashing    | Pure JS (Docker-friendly), battle-tested, widely adopted              |

### Supporting

| Library | Version           | Purpose               | When to Use                                                  |
| ------- | ----------------- | --------------------- | ------------------------------------------------------------ |
| zod     | 4.3.6 (installed) | Credential validation | Already in project; use for email/password schema validation |

### Alternatives Considered

| Instead of   | Could Use         | Tradeoff                                                                        |
| ------------ | ----------------- | ------------------------------------------------------------------------------- |
| bcrypt       | @node-rs/argon2   | Argon2 is stronger security but requires native compilation; bcrypt is pure JS  |
| JWT sessions | Database sessions | DB sessions allow instant revocation but aren't Edge-compatible with PostgreSQL |

**Installation:**

```bash
npm install next-auth@beta @auth/drizzle-adapter bcrypt
```

## Architecture Patterns

### Recommended Project Structure

```
/
├── auth.ts                    # Central Auth.js configuration (ROOT LEVEL)
├── proxy.ts                   # Next.js 16 middleware replacement (ROOT LEVEL)
├── src/
│   ├── app/
│   │   └── api/
│   │       └── auth/
│   │           └── [...nextauth]/
│   │               └── route.ts   # API route handler
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts           # Existing db export
│   │   │   └── schema.ts          # Existing + auth tables
│   │   └── auth/
│   │       └── password.ts        # bcrypt utilities
│   └── types/
│       └── next-auth.d.ts         # (optional) Separate type file
```

### Pattern 1: Auth.js v5 Configuration (auth.ts)

**What:** Central configuration file at project root that exports `auth()`, `handlers`, `signIn`, `signOut`

**When to use:** Required for all Auth.js v5 setups

**Example:**

```typescript
// Source: https://authjs.dev/getting-started/installation
// auth.ts (at project root)
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/src/lib/db";
import { saltAndHashPassword, verifyPassword } from "@/src/lib/auth/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" }, // REQUIRED for Edge compatibility
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        // Validate with Zod
        // Verify password with bcrypt
        // Return user object or null
      },
    }),
  ],
  callbacks: {
    // Add user.id to session
    session: async ({ session, token }) => {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    // Route protection callback
    authorized: async ({ auth }) => {
      return !!auth;
    },
  },
});
```

### Pattern 2: API Route Handler

**What:** App Router route handler that re-exports GET and POST methods

**When to use:** Required for handling Auth.js API requests

**Example:**

```typescript
// Source: https://authjs.dev/getting-started/installation
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

### Pattern 3: Next.js 16 Proxy (Route Protection)

**What:** Replaces middleware.ts; uses `authorized` callback for route protection

**When to use:** Required for protecting routes in Next.js 16

**Example:**

```typescript
// Source: https://authjs.dev/getting-started/session-management/protecting
// proxy.ts (at project root)
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  // req.auth contains the session (or null if not authenticated)
  const isLoggedIn = !!req.auth;

  // Allow auth routes and static assets
  if (
    req.nextUrl.pathname.startsWith("/api/auth") ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn && req.nextUrl.pathname !== "/login") {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(loginUrl);
  }

  return NextResponse.next();
});

// Configure which routes the proxy runs on
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login|register).*)"],
};
```

### Pattern 4: TypeScript Session Type Augmentation

**What:** Extends the Session interface to include `user.id`

**When to use:** Required for type-safe access to `session.user.id` in server actions

**Example:**

```typescript
// Source: https://authjs.dev/getting-started/typescript
// auth.ts (at project root, same file as config)
import NextAuth, { type DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      /** The user's unique identifier */
      id: string
    } & DefaultSession["user"]
  }
}

// Then in callbacks:
callbacks: {
  session: async ({ session, token }) => {
    if (token?.sub) {
      session.user.id = token.sub
    }
    return session
  },
}
```

### Pattern 5: Password Hashing with bcrypt

**What:** Secure password hashing using bcrypt

**When to use:** In Credentials provider authorize() and user registration

**Example:**

```typescript
// Source: Standard bcrypt pattern
// src/lib/auth/password.ts
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
```

### Pattern 6: Zod Credential Validation

**What:** Schema validation for login credentials

**When to use:** In Credentials provider authorize() function

**Example:**

```typescript
// Source: https://authjs.dev/getting-started/authentication/credentials
// src/lib/validations/auth.ts
import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
});

// Usage in authorize:
const { email, password } = await signInSchema.parseAsync(credentials);
```

### Anti-Patterns to Avoid

- **Database sessions with PostgreSQL:** Not Edge-compatible; proxy.ts will fail. Use `session: { strategy: "jwt" }` instead.
- **NEXTAUTH\_ env prefix:** Auth.js v5 uses `AUTH_` prefix (e.g., `AUTH_SECRET`, `AUTH_URL`)
- **middleware.ts in Next.js 16:** Renamed to `proxy.ts`; using old name won't work
- **Storing password in JWT:** Never include passwords in tokens; only store user ID
- **Forgetting salt rounds:** Always use 10-12 salt rounds with bcrypt

## Don't Hand-Roll

| Problem            | Don't Build           | Use Instead                            | Why                                              |
| ------------------ | --------------------- | -------------------------------------- | ------------------------------------------------ |
| Session management | Custom JWT handling   | Auth.js `session: { strategy: "jwt" }` | Edge cases, refresh, rotation handled            |
| Password hashing   | Custom crypto         | bcrypt                                 | Timing attacks, salt generation, proven security |
| CSRF protection    | Custom tokens         | Auth.js built-in                       | Integrated with session flow                     |
| Cookie management  | Manual cookie setting | Auth.js handlers                       | HttpOnly, Secure, SameSite correctly configured  |

**Key insight:** Auth.js handles the entire auth flow including cookies, CSRF, and session management. Custom solutions introduce security vulnerabilities.

## Common Pitfalls

### Pitfall 1: Database Session Strategy + Edge Runtime

**What goes wrong:** Using `strategy: "database"` causes proxy.ts to fail because PostgreSQL isn't Edge-compatible

**Why it happens:** Drizzle's PostgreSQL adapter uses the `postgres` package which uses TCP sockets, not supported in Edge Runtime

**How to avoid:** Always use `session: { strategy: "jwt" }` when using proxy.ts

**Warning signs:** Build errors about Edge Runtime, proxy not executing, "Dynamic server usage" errors

### Pitfall 2: Missing AUTH_SECRET Environment Variable

**What goes wrong:** Application crashes or JWT encryption fails

**Why it happens:** AUTH_SECRET is required for JWT encryption; easy to forget during setup

**How to avoid:** Generate with `npx auth secret` before first run; add to .env and Docker environment

**Warning signs:** "Missing AUTH_SECRET" error, JWT decryption failures

### Pitfall 3: Session Type Not Augmented

**What goes wrong:** TypeScript errors when accessing `session.user.id`

**Why it happens:** Default Session type doesn't include custom fields

**How to avoid:** Add module augmentation in auth.ts to extend Session interface

**Warning signs:** `Property 'id' does not exist on type 'User'`

### Pitfall 4: Proxy Matcher Too Broad

**What goes wrong:** Auth API routes get blocked, static assets fail, login page redirects infinitely

**Why it happens:** matcher config runs proxy on ALL routes including auth endpoints

**How to avoid:** Use negative lookahead in matcher regex: `/((?!api/auth|_next|login).*)/`

**Warning signs:** 401 errors on login, infinite redirect loops, static 404s

### Pitfall 5: Not Passing User ID Through JWT Callback

**What goes wrong:** `session.user.id` is undefined even after augmenting types

**Why it happens:** Types are augmented but the actual data isn't populated

**How to avoid:** Use jwt callback to store user.id in token, then session callback to copy to session

**Warning signs:** `session.user.id` is undefined at runtime despite correct types

## Code Examples

### Complete Auth.ts Configuration

```typescript
// Source: https://authjs.dev/getting-started/installation
// auth.ts (project root)
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/src/lib/db";
import { users } from "@/src/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/src/lib/auth/password";
import { signInSchema } from "@/src/lib/validations/auth";
import { ZodError } from "zod";

// Extend Session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const { email, password } = await signInSchema.parseAsync(credentials);

          const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

          if (!user?.password) {
            return null;
          }

          const isValid = await verifyPassword(password, user.password);
          if (!isValid) {
            return null;
          }

          return { id: user.id, email: user.email, name: user.name };
        } catch (error) {
          if (error instanceof ZodError) {
            return null;
          }
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    authorized: async ({ auth }) => {
      return !!auth;
    },
  },
});
```

### Using Session in Server Actions

```typescript
// Example usage in server action
// src/actions/example-action.ts
"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";

export async function getMyExpenses() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userExpenses = await db.select().from(expenses).where(eq(expenses.userId, session.user.id));

  return { success: true, data: userExpenses };
}
```

## State of the Art

| Old Approach                | Current Approach           | When Changed | Impact                                    |
| --------------------------- | -------------------------- | ------------ | ----------------------------------------- |
| middleware.ts               | proxy.ts                   | Next.js 16   | Required file rename for route protection |
| NEXTAUTH\_ prefix           | AUTH\_ prefix              | Auth.js v5   | Environment variable naming convention    |
| Database sessions (default) | JWT sessions (recommended) | Auth.js v5   | Better Edge compatibility                 |
| next-auth v4 separate APIs  | v5 unified `auth()` API    | Auth.js v5   | Simpler API surface                       |

**Deprecated/outdated:**

- `NEXTAUTH_SECRET`: Use `AUTH_SECRET` instead
- `middleware.ts`: Use `proxy.ts` in Next.js 16
- `getSession()` client-side: Use `auth()` server-side for RSC

## Open Questions

1. **Should we use the `pages` config for custom login/register routes?**
   - What we know: Auth.js supports `pages.signIn` config
   - What's unclear: Phase 4 implements login/register UI; Phase 1 just needs redirect target
   - Recommendation: Add `pages: { signIn: "/login" }` now to establish the redirect target

2. **Should auth tables be in separate schema file?**
   - What we know: Auth.js requires users, accounts, sessions, verificationTokens tables
   - What's unclear: Whether to add to existing schema.ts or create separate auth-schema.ts
   - Recommendation: Add to existing schema.ts for simplicity; tables are few and clearly namespaced

## Sources

### Primary (HIGH confidence)

- Auth.js Installation: https://authjs.dev/getting-started/installation — Package names, v5 setup pattern, proxy.ts naming
- Auth.js Drizzle Adapter: https://authjs.dev/getting-started/adapters/drizzle — Schema requirements, adapter config
- Auth.js Credentials Provider: https://authjs.dev/getting-started/authentication/credentials — Email/password auth pattern
- Auth.js Session Strategies: https://authjs.dev/concepts/session-strategies — JWT vs database trade-offs
- Auth.js Protecting Resources: https://authjs.dev/getting-started/session-management/protecting — Route protection patterns
- Auth.js TypeScript: https://authjs.dev/getting-started/typescript — Module augmentation pattern

### Secondary (MEDIUM confidence)

- npm registry — Exact version numbers verified (next-auth@5.0.0-beta.30, @auth/drizzle-adapter@1.11.1, bcrypt@6.0.0)

### Codebase Analysis (HIGH confidence)

- `/home/coder/cashlytics/src/lib/db/schema.ts` — Current schema structure (8 tables, no userId columns yet)
- `/home/coder/cashlytics/src/lib/db/index.ts` — Existing Drizzle setup with postgres.js driver
- `/home/coder/cashlytics/src/app/layout.tsx` — Root layout for SessionProvider integration point
- `/home/coder/cashlytics/package.json` — Existing dependencies (zod@4.3.6 already installed)
- `/home/coder/cashlytics/Dockerfile` — Multi-stage build, no changes needed
- `/home/coder/cashlytics/docker-compose.yml` — PostgreSQL 16 already configured

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — Official Auth.js docs verified, exact npm versions confirmed
- Architecture: HIGH — Official patterns for Next.js 16, App Router, Drizzle
- Pitfalls: HIGH — Common issues documented in official docs and project research

**Research date:** 2026-02-24
**Valid until:** 30 days (Auth.js v5 stable patterns, Next.js 16 proxy pattern)
