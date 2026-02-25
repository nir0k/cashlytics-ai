# Phase 5: Registration Mode Logic - Research

**Researched:** 2026-02-25
**Domain:** Next.js Server Actions + Environment Variable gating + Drizzle ORM user count query
**Confidence:** HIGH

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                              | Research Support                                                                         |
| ------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| MODE-01 | SINGLE_USER_MODE in .env steuert Registrierungs-Verhalten                | `process.env.SINGLE_USER_MODE` read in `registerAction`; gating logic before DB insert   |
| MODE-02 | SINGLE_USER_EMAIL in .env definiert den Single-User                      | Already used in deprecated `user-id.ts`; now used to validate the single permitted email |
| MODE-03 | Bei SINGLE_USER_MODE=true ist Registrierung deaktiviert nach erstem User | Count query on `users` table in `registerAction`; reject if count > 0                    |
| MODE-04 | Bei SINGLE_USER_MODE=false kann sich jeder registrieren                  | No gating — current behaviour already satisfies this; no code change needed              |

</phase_requirements>

---

## Summary

Phase 5 is entirely contained within the existing `registerAction` server action in `src/actions/auth-actions.ts`. No new libraries are needed. The work is: read two environment variables (`SINGLE_USER_MODE`, `SINGLE_USER_EMAIL`), add a conditional guard block early in the action, and expose the correct error messages to the `RegisterForm` client component via the existing `AuthActionState` shape.

The core logic for `SINGLE_USER_MODE=true` is: count rows in the `users` table. If any user exists, reject all new registrations. Optionally (per MODE-02), if `SINGLE_USER_EMAIL` is set, the error message can name which email is the permitted one — but the blocking is based on user count, not email matching.

The register page (`/register`) currently has no server-side gating — it is simply an allowed public route in `proxy.ts`. In single-user mode, once a user exists, visiting `/register` should either redirect to `/login` (cleanest UX) or show a disabled state. The recommended approach is: add a `getRegistrationStatus` server utility that the page renders server-side, redirecting to `/login` when registration is closed.

**Primary recommendation:** Add a single guard block at the top of `registerAction` and add an optional server-side redirect in the `/register` page component. No new dependencies required.

---

## Standard Stack

### Core (already in project — no new installs)

| Library                    | Version           | Purpose                                      | Why Standard                    |
| -------------------------- | ----------------- | -------------------------------------------- | ------------------------------- |
| drizzle-orm                | already installed | COUNT query on `users` table                 | Already the project ORM         |
| next/navigation `redirect` | Next.js 15        | Server-side redirect in page component       | Already used in auth-actions.ts |
| `process.env`              | Node.js built-in  | Read `SINGLE_USER_MODE`, `SINGLE_USER_EMAIL` | Standard env access             |

### No new dependencies needed

This phase is pure logic on top of existing infrastructure. No `npm install` required.

---

## Architecture Patterns

### Recommended File Changes

```
src/
├── actions/
│   └── auth-actions.ts          # Add SINGLE_USER_MODE guard in registerAction
├── lib/
│   └── auth/
│       └── registration-mode.ts # NEW: getRegistrationStatus() helper
└── app/
    └── (auth)/
        └── register/
            └── page.tsx         # Add server-side redirect when registration closed
```

### Pattern 1: Environment Variable Guard in Server Action

**What:** Read `SINGLE_USER_MODE` at the top of `registerAction`. If `true`, count users. If any exist, return an error state — do not proceed with registration.

**When to use:** Every call to `registerAction` when `SINGLE_USER_MODE=true`.

**Example:**

```typescript
// src/actions/auth-actions.ts
export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  // --- MODE GATE ---
  const singleUserMode = process.env.SINGLE_USER_MODE === "true";
  if (singleUserMode) {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    if (count > 0) {
      return { error: "Registration is disabled. This instance is in single-user mode." };
    }
  }
  // --- END MODE GATE ---

  // ... existing validation and insert logic unchanged
}
```

**Source:** Drizzle ORM COUNT query pattern — drizzle-orm docs (sql template tag).

### Pattern 2: Server Component Redirect for Closed Registration

**What:** The `/register` page is a Server Component. It can run a server-side check and redirect before the form renders.

**When to use:** `SINGLE_USER_MODE=true` AND at least one user already exists.

**Example:**

```typescript
// src/lib/auth/registration-mode.ts
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function isRegistrationOpen(): Promise<boolean> {
  const singleUserMode = process.env.SINGLE_USER_MODE === "true";
  if (!singleUserMode) return true;

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  return count === 0;
}
```

```typescript
// src/app/(auth)/register/page.tsx
import { redirect } from "next/navigation";
import { isRegistrationOpen } from "@/lib/auth/registration-mode";
import { RegisterForm } from "@/components/organisms/register-form";

export default async function RegisterPage() {
  const open = await isRegistrationOpen();
  if (!open) {
    redirect("/login");
  }
  return <RegisterForm />;
}
```

**Source:** Next.js 15 App Router server component redirect pattern. Already used in this project — `redirect()` after try/catch is the established decision (STATE.md: [Phase 04-01]).

### Pattern 3: .env.example Documentation

**What:** Add `SINGLE_USER_MODE` and confirm `SINGLE_USER_EMAIL` to `.env.example` with comments.

**When to use:** As part of this phase — docs must match implementation.

```bash
# --------------------------------------------
# Registration Mode (Required for production)
# --------------------------------------------
# Set to "true" to disable registration after the first user signs up.
# Intended for personal/self-hosted single-person deployments.
# Set to "false" (or omit) to allow open registration.
SINGLE_USER_MODE=true

# Email of the owner in single-user mode.
# Used during data migration to assign existing records to this user.
# Must match the email used when first registering.
SINGLE_USER_EMAIL=you@example.com
```

### Anti-Patterns to Avoid

- **Checking `SINGLE_USER_EMAIL` to decide who can register:** MODE-03 says "registration is disabled after the first user exists" — the trigger is user count, not email matching. Do not check if the submitted email matches `SINGLE_USER_EMAIL`; that would break the intended flow where the first user registers freely with any email.
- **Putting mode logic in `proxy.ts`:** The proxy runs on the Edge and cannot make DB calls (no Drizzle in Edge runtime). Mode gating belongs in the server action and server component.
- **Calling `isRegistrationOpen()` inside a Client Component:** `db` queries cannot run client-side. Keep this in Server Components and Server Actions only.
- **Reading env vars client-side without `NEXT_PUBLIC_` prefix:** `SINGLE_USER_MODE` is server-only config. Never expose it with `NEXT_PUBLIC_` or pass it via props to client components.
- **Using COUNT(\*) without `::int` cast:** Drizzle returns the PostgreSQL count as a string by default. Cast to `::int` or parse with `Number()` before comparison.

---

## Don't Hand-Roll

| Problem                                | Don't Build           | Use Instead                                             | Why                                                  |
| -------------------------------------- | --------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| User count check                       | Custom raw SQL string | `drizzle-orm` `sql` template + `count(*)::int`          | Type-safe, already used in project                   |
| Server redirect on closed registration | Client-side JS guard  | `redirect()` from `next/navigation` in Server Component | Next.js built-in, consistent with existing pattern   |
| Env var parsing                        | Custom `.env` parser  | `process.env.SINGLE_USER_MODE`                          | Node.js built-in, Next.js loads `.env` automatically |

**Key insight:** Everything this phase needs is already in the project. The entire implementation is ~30 lines of new code across two files, plus a utility function.

---

## Common Pitfalls

### Pitfall 1: Environment Variable String Comparison

**What goes wrong:** `process.env.SINGLE_USER_MODE` is always a string or `undefined`, never a boolean. Writing `if (process.env.SINGLE_USER_MODE)` evaluates `"false"` as truthy.

**Why it happens:** `process.env` values are strings. `"false"` is a truthy string.

**How to avoid:** Always compare explicitly: `process.env.SINGLE_USER_MODE === "true"`.

**Warning signs:** App locks registration even when env is set to `"false"`.

### Pitfall 2: Race Condition on First Registration

**What goes wrong:** Two users submit the register form simultaneously when no users exist. Both pass the `count === 0` check and both successfully insert a user. This violates single-user-mode intent.

**Why it happens:** The count check and insert are two separate DB operations, not atomic.

**How to avoid:** The `users.email` column has a `UNIQUE` constraint (per schema.ts line 41). The second insert will fail with a unique constraint error. Wrap the insert in try/catch and handle the DB error gracefully. Alternatively, accept this edge case as negligible for a self-hosted personal app where two people are unlikely to register simultaneously.

**Warning signs:** Two users exist in single-user mode after simultaneous first registration.

**Recommended approach:** Since this is a self-hosted personal app, accept the unique constraint as sufficient protection. The DB will reject the duplicate email anyway.

### Pitfall 3: Register Page Accessible After User Exists

**What goes wrong:** A logged-out user bookmarks `/register` and visits it after the owner has registered. Without the server-side redirect, they see the form but get an error on submit.

**Why it happens:** The register route is in the public routes list in `proxy.ts` and has no conditional logic.

**How to avoid:** Add the `isRegistrationOpen()` check in the `/register` page server component with `redirect("/login")`.

**Warning signs:** `/register` renders the form even though `SINGLE_USER_MODE=true` and users exist.

### Pitfall 4: Drizzle COUNT Returns String Not Number

**What goes wrong:** `count > 0` always evaluates to `false` when count is the string `"0"`.

**Why it happens:** PostgreSQL aggregate functions return numeric strings in some Drizzle versions.

**How to avoid:** Use `sql<number>\`count(\*)::int\``to cast at the DB level, or wrap with`Number(count)`.

**Warning signs:** Mode gate never activates even though users exist.

---

## Code Examples

Verified patterns from project codebase and Drizzle ORM conventions:

### COUNT query with Drizzle sql template

```typescript
// Pattern: COUNT rows in a table using drizzle sql tag
// Source: Drizzle ORM documentation (sql template tag)
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);

if (count > 0) {
  // users exist
}
```

### Existing registerAction structure (from src/actions/auth-actions.ts)

```typescript
// Current flow — gate should be injected at TOP before validation
export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  // [INSERT MODE GATE HERE — before Zod parse]

  const result = registerSchema.safeParse({ ... });
  if (!result.success) { return { fieldErrors }; }

  const { email, password } = result.data;

  // Check duplicate email
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) { return { fieldErrors: { email: "An account with this email already exists" } }; }

  // Insert user
  const hashedPassword = await hashPassword(password);
  await db.insert(users).values({ email, password: hashedPassword });

  // Auto-login then redirect
  let shouldRedirect = false;
  try {
    await signIn("credentials", { email, password, redirect: false });
    shouldRedirect = true;
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }
  if (shouldRedirect) redirect("/");
  return {};
}
```

### AuthActionState already supports `error` field for global errors

```typescript
// From src/actions/auth-actions.ts — no new types needed
export type AuthActionState = {
  error?: string; // Global error shown above form
  fieldErrors?: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
};
```

The `state.error` is already rendered in `RegisterForm` (register-form.tsx lines 63-67) — mode gate message will display automatically.

---

## State of the Art

| Old Approach                                           | Current Approach                      | Notes                              |
| ------------------------------------------------------ | ------------------------------------- | ---------------------------------- |
| `getCurrentUserId()` with `SINGLE_USER_EMAIL` fallback | `requireAuth()` — strict session only | `user-id.ts` deprecated in Phase 3 |
| No registration gating                                 | Phase 5 adds `SINGLE_USER_MODE` guard | Being implemented                  |
| Open `/register` route                                 | Phase 5 adds server-side redirect     | Being implemented                  |

**Relevant existing decisions (from STATE.md):**

- `03-01`: `requireAuth()` has NO `SINGLE_USER_EMAIL` fallback — unauthenticated = unauthorized. Phase 5 does NOT change this.
- `04-01`: `redirect()` placed after try/catch block — NEXT_REDIRECT errors cannot be caught inside try/catch.
- `04-01`: `signIn()` called with `redirect:false`, then redirect manually.

---

## Open Questions

1. **Should `SINGLE_USER_EMAIL` gate WHO can register (first user only with that email)?**
   - What we know: REQUIREMENTS.md MODE-02 says `SINGLE_USER_EMAIL` "definiert den Single-User" (defines the single user) — it is used primarily for data migration attribution (MIG-03), not as a registration whitelist.
   - What's unclear: Should the register action also enforce that the first registration email MUST match `SINGLE_USER_EMAIL`?
   - Recommendation: Do NOT enforce email match during registration. MODE-03 specifies blocking "after first user exists" — the mechanism is user count, not email. Adding email enforcement would be extra scope. If desired, it can be a follow-up.

2. **Should the register page show a "closed" message or silently redirect?**
   - What we know: The project uses server-side `redirect()` to handle similar cases (logged-in users hitting /login are redirected to /).
   - Recommendation: Redirect to `/login` silently. Optionally pass a search param like `?error=registration-closed` so the login page can show an informational message, but that is optional scope.

---

## Sources

### Primary (HIGH confidence)

- Project source: `src/actions/auth-actions.ts` — existing `registerAction` structure
- Project source: `src/lib/db/schema.ts` — `users` table definition, email unique constraint
- Project source: `src/proxy.ts` — public route list (`/register` currently always allowed)
- Project source: `.env.example` — existing env var documentation
- Project source: `src/lib/auth/user-id.ts` — deprecated `SINGLE_USER_EMAIL` usage pattern
- Project source: `.planning/STATE.md` — all established decisions

### Secondary (MEDIUM confidence)

- Drizzle ORM `sql` template tag for raw SQL expressions — standard Drizzle pattern for COUNT queries
- Next.js 15 App Router: `redirect()` from `next/navigation` in Server Components — documented Next.js feature

### Tertiary (LOW confidence)

- None — all claims are verifiable from project source or well-established framework behaviour.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new libraries; all existing project dependencies
- Architecture: HIGH — follows patterns already established in this codebase (STATE.md decisions)
- Pitfalls: HIGH — `process.env` string comparison and Drizzle COUNT cast are well-known patterns
- Scope: HIGH — requirements are narrow and explicit; implementation path is unambiguous

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable — depends only on project internals, no fast-moving external libraries)
