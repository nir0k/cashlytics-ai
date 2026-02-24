# Architecture Research: Auth.js v5 + Multi-User Auth

**Domain:** Multi-User Authentication for Next.js 16 Financial App
**Researched:** 2026-02-24
**Confidence:** HIGH (Official Auth.js documentation + existing codebase analysis)

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROXY LAYER (proxy.ts)                             │
│  - Route protection via authorized callback                                  │
│  - Redirects unauthenticated users to /login                                 │
│  - Matcher excludes: /api, /_next, /auth, static assets                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                           PRESENTATION LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboard   │  │   Accounts   │  │   Expenses   │  │   Settings   │     │
│  │  (Protected) │  │  (Protected) │  │  (Protected) │  │  (Protected) │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │                 │              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                        │
│  │    Login     │  │   Register   │  │   Layout     │                        │
│  │  (Public)    │  │  (Public)    │  │  (Session)   │                        │
│  └──────────────┘  └──────────────┘  └──────────────┘                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                          AUTHENTICATION LAYER                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  auth.ts (Root)                                                        │  │
│  │  - NextAuth() configuration                                           │  │
│  │  - DrizzleAdapter integration                                         │  │
│  │  - Credentials provider (email/password)                              │  │
│  │  - Session callbacks (add userId to session)                          │  │
│  │  - Exports: auth, handlers, signIn, signOut                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  /api/auth/[...nextauth]/route.ts                                     │  │
│  │  - Re-exports GET/POST handlers                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                           DATA ACCESS LAYER                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Server     │  │   Server     │  │   Server     │  │   Server     │     │
│  │  Actions     │  │  Actions     │  │  Actions     │  │  Actions     │     │
│  │  (accounts)  │  │  (expenses)  │  │  (income)    │  │  (convers.)  │     │
│  │              │  │              │  │              │  │              │     │
│  │  +userId     │  │  +userId     │  │  +userId     │  │  +userId     │     │
│  │  filter      │  │  filter      │  │  filter      │  │  filter      │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │                 │              │
├─────────┴─────────────────┴─────────────────┴─────────────────┴──────────────┤
│                           DATABASE LAYER                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Drizzle ORM + PostgreSQL                                            │   │
│  │                                                                       │   │
│  │  Auth Tables (NEW):        Application Tables (MODIFIED):            │   │
│  │  - users                   - accounts (+userId FK)                   │   │
│  │  - accounts (auth)         - categories (+userId FK)                 │   │
│  │  - sessions                - expenses (+userId FK)                   │   │
│  │  - verificationTokens      - incomes (+userId FK)                    │   │
│  │                            - dailyExpenses (+userId FK)              │   │
│  │                            - transfers (+userId FK)                  │   │
│  │                            - documents (+userId FK)                  │   │
│  │                            - conversations (+userId FK)              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component           | Responsibility                                  | Location                                   | Communicates With            |
| ------------------- | ----------------------------------------------- | ------------------------------------------ | ---------------------------- |
| **auth.ts**         | Central Auth.js config, exports auth primitives | `/auth.ts` (root)                          | DB adapter, providers, proxy |
| **proxy.ts**        | Route protection, session verification          | `/proxy.ts` (root)                         | auth.ts, routes              |
| **auth route**      | Handle OAuth/session API endpoints              | `/src/app/api/auth/[...nextauth]/route.ts` | auth.ts handlers             |
| **Server Actions**  | Data mutations with userId filtering            | `/src/actions/*.ts`                        | DB, auth.ts (session)        |
| **SessionProvider** | Client-side session access                      | `/src/components/providers/index.tsx`      | Client components            |
| **DrizzleAdapter**  | Persist Auth.js data to PostgreSQL              | Configured in auth.ts                      | DB                           |

## Recommended Project Structure

```
cashlytics/
├── auth.ts                           # Auth.js v5 configuration (NEW)
├── auth.config.ts                    # Edge-compatible config split (optional)
├── proxy.ts                          # Route protection (NEW, was middleware.ts)
│
├── src/
│   ├── app/
│   │   ├── (auth)/                   # Auth route group (NEW)
│   │   │   ├── login/
│   │   │   │   └── page.tsx          # Login page
│   │   │   └── register/
│   │   │       └── page.tsx          # Registration page
│   │   │
│   │   ├── (dashboard)/              # Protected routes (EXISTING)
│   │   │   └── layout.tsx            # Already exists
│   │   │
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts      # Auth API handlers (NEW)
│   │   │
│   │   └── layout.tsx                # Root layout (add SessionProvider)
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts             # Add userId FKs + auth tables
│   │   │   └── index.ts              # Drizzle client (unchanged)
│   │   │
│   │   └── auth/
│   │       ├── index.ts              # Auth helper utilities (NEW)
│   │       └── validations.ts        # Auth form schemas (NEW)
│   │
│   ├── actions/                      # Server actions (MODIFY ALL)
│   │   ├── accounts-actions.ts       # Add userId filtering
│   │   ├── expenses-actions.ts       # Add userId filtering
│   │   ├── income-actions.ts         # Add userId filtering
│   │   ├── transfer-actions.ts       # Add userId filtering
│   │   ├── category-actions.ts       # Add userId filtering
│   │   ├── conversation-actions.ts   # Add userId filtering
│   │   └── ...                       # All others need userId
│   │
│   └── components/
│       └── providers/
│           └── index.tsx             # Add SessionProvider (MODIFY)
│
└── drizzle/                          # Migrations folder
    └── 0002_add_multi_user.sql       # Migration for userId FKs (NEW)
```

### Structure Rationale

- **`/auth.ts` at root:** Auth.js v5 convention. Must be at root for `auth()` to work in server components and proxy.
- **`/proxy.ts` at root:** Next.js 16 renamed middleware to proxy. Must be at root.
- **`(auth)/` route group:** Separate public auth pages from protected dashboard routes.
- **`/lib/auth/` utilities:** Centralized auth helpers (requireAuth, getCurrentUser) keep actions clean.

## Architectural Patterns

### Pattern 1: Universal `auth()` Function

**What:** Single function to get session anywhere - server components, API routes, server actions.

**When:** Always. This replaces `getServerSession`, `useSession` for server-side, `getToken`.

**Example:**

```typescript
// In any server action
import { auth } from "@/auth";

export async function getAccounts() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nicht authentifiziert" };
  }

  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, session.user.id));

  return { success: true, data: userAccounts };
}
```

### Pattern 2: Proxy-Based Route Protection

**What:** Use `authorized` callback in auth.ts for declarative route protection.

**When:** All protected routes. Primary defense at the edge.

**Example:**

```typescript
// proxy.ts (Next.js 16+)
export { auth as proxy } from "@/auth";

// auth.ts
export const { auth, handlers, signIn, signOut } = NextAuth({
  callbacks: {
    authorized: async ({ auth, request: { nextUrl } }) => {
      const isLoggedIn = !!auth?.user;
      const isAuthRoute =
        nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");

      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      return isLoggedIn;
    },
  },
});
```

### Pattern 3: Query-Level Row Isolation

**What:** Every database query filters by `userId` from session. Never rely solely on middleware.

**When:** Every server action that reads/writes user data.

**Example:**

```typescript
// Pattern: All actions follow this structure
export async function createExpense(data: NewExpense) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nicht authentifiziert" };
  }

  const [expense] = await db
    .insert(expenses)
    .values({ ...data, userId: session.user.id }) // Always include userId
    .returning();

  return { success: true, data: expense };
}

export async function getExpenses(filters?: Filters) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nicht authentifiziert" };
  }

  // ALWAYS filter by userId
  const conditions = [eq(expenses.userId, session.user.id)];
  // ... add other filters

  return db
    .select()
    .from(expenses)
    .where(and(...conditions));
}
```

### Pattern 4: Session User ID in Callbacks

**What:** Add `userId` to session object via callbacks so it's available everywhere.

**When:** Initial auth setup. One-time configuration.

**Example:**

```typescript
// auth.ts
export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      // ... credentials config
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
```

### Pattern 5: Helper Utility Pattern

**What:** Create reusable auth helpers to reduce boilerplate in actions.

**When:** When you have many server actions (this project has 15+).

**Example:**

```typescript
// src/lib/auth/index.ts
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

export async function getOptionalAuth() {
  return await auth();
}

export function unauthorizedResponse(message = "Nicht authentifiziert") {
  return { success: false, error: message } as const;
}
```

## Data Flow

### Request Flow (Protected Route)

```
User Request
    ↓
┌─────────────────────────────────────────────────┐
│  proxy.ts (Edge)                                │
│  - Check session via authorized callback        │
│  - If no session: redirect to /login            │
│  - If session exists: continue                  │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  Server Component (page.tsx)                    │
│  - Calls server action                          │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  Server Action                                  │
│  1. Call auth() to get session                  │
│  2. Extract userId from session.user.id         │
│  3. Query DB with userId filter                 │
│  4. Return data                                 │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  Database                                       │
│  - WHERE userId = session.user.id               │
│  - Returns only user's data                     │
└─────────────────────────────────────────────────┘
```

### Session Propagation Flow

```
Login Request
    ↓
┌─────────────────────────────────────────────────┐
│  Credentials Provider                           │
│  - Verify email/password                         │
│  - Return user object with id                   │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  jwt callback                                   │
│  - token.id = user.id                           │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  session callback                               │
│  - session.user.id = token.id                   │
│  - Now available in all auth() calls            │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  Session stored in:                             │
│  - JWT cookie (default)                         │
│  - OR database session table (if configured)    │
└─────────────────────────────────────────────────┘
```

### Key Data Flows

1. **Authentication:** Login → Credentials verify → JWT created → Session callback adds userId → Cookie set
2. **Authorization:** Request → Proxy checks session → Server action calls auth() → userId extracted → DB query filtered
3. **Data Isolation:** All queries include `WHERE userId = ?` condition from session

## Schema Changes Required

### New Auth Tables (Auth.js Drizzle Adapter)

```typescript
// Add to src/lib/db/schema.ts

// Auth.js required tables
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  password: text("password"), // For credentials provider
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authAccounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    compositePk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  })
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (table) => ({
    compositePk: primaryKey({ columns: [table.identifier, table.token] }),
  })
);
```

### Existing Tables - Add userId FK

```typescript
// Add userId to all existing tables

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // NEW
  name: text("name").notNull(),
  // ... rest unchanged
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // NEW
  name: text("name").notNull(),
  // ... rest unchanged
});

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // NEW
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "cascade" }),
  // ... rest unchanged
});

export const incomes = pgTable("incomes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // NEW
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "cascade" }),
  // ... rest unchanged
});

export const dailyExpenses = pgTable("daily_expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // NEW
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "cascade" }),
  // ... rest unchanged
});

export const transfers = pgTable("transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // NEW
  sourceAccountId: uuid("source_account_id")
    .references(() => accounts.id, { onDelete: "cascade" })
    .notNull(),
  // ... rest unchanged
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // NEW
  expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "cascade" }),
  // ... rest unchanged
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // NEW
  title: text("title").notNull().default("Neuer Chat"),
  // ... rest unchanged
});
```

## Build Order (Dependencies)

### Phase 1: Core Auth Infrastructure

```
1. Install dependencies
   └── npm install next-auth@beta @auth/drizzle-adapter bcryptjs

2. Create auth tables in schema
   └── users, authAccounts, sessions, verificationTokens

3. Create auth.ts at root
   └── Configure NextAuth with DrizzleAdapter
   └── Add Credentials provider
   └── Configure callbacks (jwt, session)

4. Create API route
   └── /src/app/api/auth/[...nextauth]/route.ts

5. Create proxy.ts
   └── Export auth as proxy
   └── Configure matcher
```

### Phase 2: Database Migration

```
1. Add userId to existing tables (schema update)
   └── All 8 application tables get userId FK

2. Generate migration
   └── drizzle-kit generate

3. Create data migration script
   └── Assign existing data to SINGLE_USER_EMAIL from .env

4. Run migration
   └── Apply schema changes
   └── Run data migration

5. Update DrizzleAdapter config
   └── Pass custom table mappings if needed
```

### Phase 3: Server Actions Refactor

```
1. Create auth helper utilities
   └── /src/lib/auth/index.ts
   └── requireAuth(), getOptionalAuth()

2. Update ALL server actions (15+ files)
   └── Add session check at start of each action
   └── Add userId filter to all queries
   └── Add userId to all inserts

3. Order matters for actions:
   ├── accounts-actions.ts (other tables depend on accounts)
   ├── categories-actions.ts (expenses/dailyExpenses reference)
   ├── expenses-actions.ts
   ├── income-actions.ts
   ├── transfer-actions.ts
   ├── daily-expenses-actions.ts
   ├── document-actions.ts
   ├── conversation-actions.ts
   └── analytics-actions.ts, dashboard-actions.ts (read-only, last)
```

### Phase 4: UI Components

```
1. Add SessionProvider to root layout
   └── Wrap existing providers

2. Create login page
   └── /src/app/(auth)/login/page.tsx
   └── Form with email/password
   └── Server action for signIn

3. Create register page
   └── /src/app/(auth)/register/page.tsx
   └── Form with email/password
   └── Registration logic with SINGLE_USER_MODE check

4. Update Header component
   └── Add user menu with sign out option

5. Update AppSidebar
   └── Show user info if needed
```

### Phase 5: Registration Mode Logic

```
1. Add env variable handling
   └── SINGLE_USER_MODE=true/false
   └── SINGLE_USER_EMAIL=user@example.com

2. Create registration guard
   └── Check mode before allowing registration
   └── In single-user mode, only allow one user

3. Create migration script
   └── Assign all existing data to single user
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Middleware-Only Protection

**What people do:** Only protect routes in middleware, trusting that requests are authenticated.

**Why it's wrong:** Middleware runs at the edge. Server actions can be called directly. If actions don't verify session, data leaks.

**Do this instead:** Always verify session in every server action AND use middleware/proxy for route protection.

```typescript
// WRONG - only proxy protection
export async function getAccounts() {
  return db.select().from(accounts); // Returns ALL users' accounts!
}

// RIGHT - double verification
export async function getAccounts() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  return db.select().from(accounts).where(eq(accounts.userId, session.user.id));
}
```

### Anti-Pattern 2: Trusting Client-Side Session

**What people do:** Pass userId from client components to server actions.

**Why it's wrong:** Client can send any userId. Never trust client data for authorization.

**Do this instead:** Always get userId from server-side `auth()` call.

```typescript
// WRONG
export async function getAccounts(userId: string) {
  // userId from client!
  return db.select().from(accounts).where(eq(accounts.userId, userId));
}

// RIGHT
export async function getAccounts() {
  const session = await auth(); // Server-side verification
  return db.select().from(accounts).where(eq(accounts.userId, session.user.id));
}
```

### Anti-Pattern 3: Forgetting userId on Inserts

**What people do:** Add userId filter to reads but forget on writes.

**Why it's wrong:** New records have null userId. Orphaned data that doesn't belong to anyone.

**Do this instead:** Every insert must include userId from session.

```typescript
// WRONG
export async function createAccount(data: { name: string }) {
  return db.insert(accounts).values(data); // userId is null!
}

// RIGHT
export async function createAccount(data: { name: string }) {
  const session = await auth();
  return db.insert(accounts).values({
    ...data,
    userId: session.user.id, // Always set userId
  });
}
```

### Anti-Pattern 4: Auth Config Split Without Need

**What people do:** Split auth.ts and auth.config.ts for edge compatibility when using JWT sessions.

**Why it's wrong:** JWT sessions ARE edge-compatible. Split is only needed for database sessions with non-edge DB drivers.

**Do this instead:** Use JWT sessions (default) and keep single auth.ts file. Only split if using database sessions with non-edge-compatible ORM.

```typescript
// For this project: JWT sessions are fine
export const { auth, handlers } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" }, // JWT is edge-compatible
  // ... rest of config
});
```

## Integration with Existing Server Actions

### Current Pattern (No Auth)

```typescript
// src/actions/accounts-actions.ts (current)
export async function getAccounts(): Promise<ApiResponse<Account[]>> {
  const allAccounts = await db.select().from(accounts);
  return { success: true, data: allAccounts };
}
```

### Required Changes (With Auth)

```typescript
// src/actions/accounts-actions.ts (after)
import { auth } from "@/auth";
import { eq } from "drizzle-orm";

export async function getAccounts(): Promise<ApiResponse<Account[]>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nicht authentifiziert" };
  }

  const userAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, session.user.id))
    .orderBy(desc(accounts.createdAt));

  return { success: true, data: userAccounts };
}
```

### Files Requiring Modification

| File                        | Changes Needed                                     |
| --------------------------- | -------------------------------------------------- |
| `accounts-actions.ts`       | Add session check, userId filter on all queries    |
| `account-actions.ts`        | Add session check, userId filter on getAccountById |
| `account-detail-actions.ts` | Add session check, userId filter                   |
| `expenses-actions.ts`       | Add session check, userId filter + insert          |
| `expense-actions.ts`        | Add session check, userId filter + insert          |
| `incomes-actions.ts`        | Add session check, userId filter + insert          |
| `income-actions.ts`         | Add session check, userId filter + insert          |
| `daily-expenses-actions.ts` | Add session check, userId filter + insert          |
| `transfer-actions.ts`       | Add session check, userId filter + insert          |
| `category-actions.ts`       | Add session check, userId filter + insert          |
| `conversation-actions.ts`   | Add session check, userId filter + insert          |
| `document-actions.ts`       | Add session check, userId filter + insert          |
| `dashboard-actions.ts`      | Add session check, userId filter on aggregations   |
| `analytics-actions.ts`      | Add session check, userId filter on queries        |
| `forecast-actions.ts`       | Add session check, userId filter                   |
| `search-actions.ts`         | Add session check, userId filter                   |

## Scaling Considerations

| Scale         | Architecture Adjustments                                              |
| ------------- | --------------------------------------------------------------------- |
| 0-100 users   | JWT sessions, single proxy, direct DB queries                         |
| 100-10k users | Consider database sessions, add session cleanup cron                  |
| 10k+ users    | Add Redis for session cache, consider rate limiting on auth endpoints |

### Scaling Priorities

1. **First bottleneck:** Database connection pool during login spikes
   - Fix: Increase pool size, add connection pooling (PgBouncer)

2. **Second bottleneck:** JWT verification on every request
   - Fix: Cache session in React Server Components, use `unstable_cache`

## Sources

- Auth.js v5 Installation Guide: https://authjs.dev/getting-started/installation (HIGH confidence)
- Auth.js v5 Migration Guide: https://authjs.dev/guides/upgrade-to-v5 (HIGH confidence)
- Auth.js Drizzle Adapter: https://authjs.dev/getting-started/adapters/drizzle (HIGH confidence)
- Auth.js Protecting Resources: https://authjs.dev/getting-started/session-management/protecting (HIGH confidence)
- Next.js 16 Proxy Documentation: Referenced in Auth.js docs (HIGH confidence)
- Existing codebase analysis: /home/coder/cashlytics/src/ (HIGH confidence)

---

_Architecture research for: Auth.js v5 + Multi-User Authentication_
_Researched: 2026-02-24_
