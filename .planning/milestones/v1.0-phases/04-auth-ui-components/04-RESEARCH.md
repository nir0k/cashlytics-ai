# Phase 4: Auth UI Components - Research

**Researched:** 2026-02-24
**Domain:** Next.js App Router auth pages, Auth.js v5 SessionProvider, React server actions with form state
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page layout & visual style**

- Split layout: left panel with branding/tagline, right panel with the form
- Full Vault aesthetic: glass card, amber accents, Syne headings — consistent with dashboard
- Logo mark + "Cashlytics" text displayed above the form on auth pages
- Login and register share the same card style with a "Don't have an account? Register" link below the form

**Registration form fields**

- Fields: email + password + password confirmation (3 fields)
- Password confirmation field required ("confirm your password")
- Password requirements: minimum 8 characters + at least one number
- No Terms of Service checkbox — keep it simple

**Form UX & error handling**

- Errors appear inline below each field
- Wrong login credentials: generic message "Invalid email or password" (security best practice — don't reveal which field is wrong)
- Duplicate email on register: specific message "An account with this email already exists"
- Submit button disabled + spinner shown while the server action is running (prevents double-submit)

**Redirect & flow behavior**

- Post-login: redirect to dashboard home (/)
- Post-register: auto-login and redirect directly to dashboard (seamless — no intermediate "please log in" step)
- Post-logout: redirect to /login
- Protected route access while logged out: redirect to /login (no callbackUrl — always lands on dashboard after login)

**Auth page structural requirement**

- Auth pages must be completely separate from the dashboard layout — no sidebar, no header
- The proxy.ts (middleware) already handles protected route redirects to /login — the UI just needs to match this behavior
- SessionProvider goes in the root layout so all client components can access session state

### Claude's Discretion

- Exact split layout proportions (e.g. 40/60 or 50/50)
- Left panel content/imagery beyond logo
- Exact spacing, typography sizing within the Vault design system
- Loading skeleton or transition animations

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID       | Description                                         | Research Support                                                                |
| -------- | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| AUTH-01  | User kann sich mit Email und Passwort registrieren  | Register page with form + server action calling db.insert(users) + hashPassword |
| AUTH-02  | User kann sich mit Email und Passwort einloggen     | Login page with form + server action calling Auth.js signIn("credentials")      |
| AUTH-04  | User kann sich ausloggen                            | Logout button in sidebar footer calling Auth.js signOut() server action         |
| AUTH-06  | Login-Seite ist unter /login erreichbar             | src/app/(auth)/login/page.tsx — outside dashboard route group                   |
| AUTH-07  | Registrierungs-Seite ist unter /register erreichbar | src/app/(auth)/register/page.tsx — outside dashboard route group                |
| INFRA-04 | SessionProvider im Root Layout                      | Add SessionProvider from next-auth/react inside existing Providers component    |

</phase_requirements>

---

## Summary

Phase 4 builds the auth UI on top of a fully functioning Auth.js v5 foundation (Phase 1–3 complete). The core technical decisions are already made: `auth.ts` with Credentials provider, `proxy.ts` with route protection, `requireAuth()` for server actions, and `hashPassword`/`verifyPassword` utilities. This phase only needs to create the pages and wire SessionProvider — all backend primitives exist.

The key architectural insight is that auth pages must live outside the `(dashboard)` route group (which renders the sidebar/header layout). The cleanest approach is a parallel `(auth)` route group with its own minimal layout — full-screen split-panel, no sidebar. Auth.js v5's `signIn()` and `signOut()` server functions handle session management; the UI calls them from server actions wrapped in `useActionState` for form state and pending detection.

The SessionProvider from `next-auth/react` needs to wrap the app so client components can call `useSession()`. It belongs inside the existing `Providers` component (`src/components/providers/index.tsx`) — that file is already a `'use client'` component that wraps the whole tree.

**Primary recommendation:** Create `(auth)` route group with its own layout for the split-panel design. Use `useActionState` + `useFormStatus` for form state/spinner. Call Auth.js `signIn()` from login action, `signOut()` from logout action. Add `SessionProvider` to `Providers` component.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library                | Version         | Purpose                      | Why Standard                                            |
| ---------------------- | --------------- | ---------------------------- | ------------------------------------------------------- |
| next-auth              | 5.0.0-beta.30   | Auth framework               | Already configured in auth.ts with Credentials provider |
| next-auth/react        | (same pkg)      | SessionProvider + useSession | Client-side session access for React components         |
| bcrypt                 | 6.0.0           | Password hashing             | Already used in password.ts with hashPassword()         |
| zod                    | 4.3.6           | Form validation              | Already used in signInSchema; extend for register       |
| react (useActionState) | 19 (Next.js 15) | Form state management        | Built into React 19 — no library needed                 |

### Supporting (already installed)

| Library         | Version   | Purpose                              | When to Use                                |
| --------------- | --------- | ------------------------------------ | ------------------------------------------ |
| lucide-react    | installed | Icons (spinner, eye toggle)          | Loader2 icon for submit spinner            |
| shadcn/ui       | installed | Input, Button, Label components      | Form fields follow existing patterns       |
| next/navigation | built-in  | redirect() for post-action redirects | Server-side redirect after successful auth |

### No New Packages Required

All dependencies are already installed. This phase is purely UI + wiring.

---

## Architecture Patterns

### Recommended Project Structure

```
src/app/
├── (auth)/                      # Auth route group — NO sidebar, NO header
│   ├── layout.tsx               # Minimal: full-screen split-panel wrapper
│   ├── login/
│   │   └── page.tsx             # Login page (server component)
│   └── register/
│       └── page.tsx             # Register page (server component)
├── (dashboard)/                 # Existing dashboard route group (unchanged)
│   ├── layout.tsx               # Existing: sidebar + header
│   └── ...

src/actions/
└── auth-actions.ts              # Server actions: loginAction, registerAction, logoutAction

src/components/providers/
└── index.tsx                    # ADD SessionProvider here (already 'use client')

src/lib/validations/
└── auth.ts                      # ADD registerSchema (email + password + confirmPassword)
```

### Pattern 1: Auth Route Group Layout

**What:** A separate Next.js route group `(auth)` with its own layout that renders the full-screen split-panel design without any dashboard chrome.

**When to use:** Auth pages need completely different layout from dashboard (no sidebar, no header).

**Example:**

```tsx
// src/app/(auth)/layout.tsx
// Source: Next.js App Router route group pattern
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-[#08080a] p-12 lg:flex lg:w-[45%] xl:w-[40%]">
        {/* Vault grid + amber blob ambient */}
        <div className="vault-grid absolute inset-0 opacity-100 dark:block" />
        <div className="blob-primary absolute top-[-20%] left-[-20%] h-[70%] w-[70%]" />
        {/* Branding content */}
        <div className="relative z-10 flex flex-col items-center gap-6">
          {/* Logo + tagline — Claude's discretion for exact content */}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="bg-background flex flex-1 items-center justify-center p-8">{children}</div>
    </div>
  );
}
```

### Pattern 2: Login/Register Page as Server Component (thin)

**What:** Page files are thin server components that render a client form component. Keeps pages simple; logic lives in the form component.

**When to use:** Standard App Router pattern — page = thin shell, form = client component with state.

**Example:**

```tsx
// src/app/(auth)/login/page.tsx
import { LoginForm } from "@/components/organisms/login-form";

export default function LoginPage() {
  return <LoginForm />;
}
```

### Pattern 3: Server Actions for Auth (useActionState pattern)

**What:** Server action handles the form submission. Client component uses `useActionState` (React 19) to track state and `useFormStatus` for the pending spinner.

**When to use:** Required pattern for Next.js 15 App Router with React 19.

**Example:**

```tsx
// src/actions/auth-actions.ts
"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validations/auth";

export type AuthActionState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string; confirmPassword?: string };
};

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }
  redirect("/"); // Post-login: dashboard home
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const result = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) {
    const fieldErrors: AuthActionState["fieldErrors"] = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof typeof fieldErrors;
      fieldErrors[field] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, password } = result.data;

  // Check for duplicate email
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return { fieldErrors: { email: "An account with this email already exists" } };
  }

  // Create user
  const hashedPassword = await hashPassword(password);
  await db.insert(users).values({ email, password: hashedPassword });

  // Auto-login after registration
  await signIn("credentials", { email, password, redirect: false });
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
```

### Pattern 4: Client Form Component with useActionState

**What:** Client component uses `useActionState` to wire the server action and get form errors back. Uses `useFormStatus` inside the submit button for the spinner.

**When to use:** All auth forms in this project.

**Example:**

```tsx
// src/components/organisms/login-form.tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/actions/auth-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-amber-500 font-semibold text-black hover:bg-amber-400"
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, {});

  return (
    <div className="w-full max-w-sm">
      {/* Logo + title above card */}
      <div className="mb-8 flex flex-col items-center gap-3">{/* Logo mark + "Cashlytics" */}</div>

      <div className="glass-elevated rounded-2xl p-8">
        <h1 className="font-display mb-6 text-2xl font-bold tracking-tight">Sign in</h1>

        {state.error && <p className="text-destructive mb-4 text-sm">{state.error}</p>}

        <form action={action} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" />
            {state.fieldErrors?.email && (
              <p className="text-destructive mt-1 text-xs">{state.fieldErrors.email}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" />
            {state.fieldErrors?.password && (
              <p className="text-destructive mt-1 text-xs">{state.fieldErrors.password}</p>
            )}
          </div>

          <SubmitButton />
        </form>
      </div>

      <p className="text-muted-foreground mt-4 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-amber-500 underline-offset-4 hover:text-amber-400 hover:underline"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
```

### Pattern 5: SessionProvider Integration

**What:** `SessionProvider` from `next-auth/react` is added to the existing `Providers` component (already a `'use client'` component). This is the minimal change to satisfy INFRA-04.

**When to use:** Required once in the app to enable `useSession()` in any client component.

**Example:**

```tsx
// src/components/providers/index.tsx — MODIFIED
"use client";

import { SessionProvider } from "next-auth/react";
// ... existing imports ...

export function Providers({
  children,
  locale,
  messages,
  timeZone,
  initialCurrency,
}: ProvidersProps) {
  return (
    <SessionProvider>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
        <SettingsProvider initialLocale={locale} initialCurrency={initialCurrency}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </SettingsProvider>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
```

### Pattern 6: Logout Button in Sidebar Footer

**What:** A button in the sidebar footer that calls `logoutAction()` directly via a form action or `onClick`. Since the sidebar is a client component, use a `<form>` with `action={logoutAction}` for the simplest approach.

**When to use:** Logout trigger — any client component can use this pattern.

**Example:**

```tsx
// Inside AppSidebar (client component) — SidebarFooter area
import { logoutAction } from "@/actions/auth-actions";
import { LogOut } from "lucide-react";

// In JSX:
<form action={logoutAction}>
  <button
    type="submit"
    className="text-muted-foreground hover:text-foreground flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all hover:bg-white/[0.05]"
  >
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-transparent">
      <LogOut className="h-4 w-4" />
    </div>
    <span style={{ fontFamily: "var(--font-jakarta)" }}>Sign out</span>
  </button>
</form>;
```

### Pattern 7: Register Validation Schema

**What:** Extend the existing `signInSchema` in `src/lib/validations/auth.ts` with a register schema that adds `confirmPassword` and the "at least one number" rule.

**Example:**

```typescript
// src/lib/validations/auth.ts — ADD registerSchema
export const registerSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
```

### Anti-Patterns to Avoid

- **Using `redirect()` inside try/catch:** `redirect()` throws a special error internally. Catch only `AuthError`, then let the redirect throw outside the try block. The correct pattern: try/catch for AuthError only, then call `redirect()` after the try/catch.
- **Calling `signIn()` with `redirect: true` (default):** This throws a NEXT_REDIRECT error which crashes the server action. Always pass `redirect: false` and handle redirect manually with `redirect()`.
- **Putting SessionProvider in root layout directly:** The root `layout.tsx` is an async server component. `SessionProvider` is a client component. It must go inside `Providers` (which is already `'use client'`).
- **Custom auth layout outside route group:** Auth pages placed directly in `/app/login/page.tsx` without a route group will inherit the root layout but NOT the dashboard layout — that actually works, but you lose the ability to share the split-panel layout between login and register cleanly. Route group is cleaner.
- **Importing `hashPassword` in auth.ts:** `auth.ts` is Edge-compatible. `bcrypt` is Node.js only. The `hashPassword` utility must only be called in server actions, not in `auth.ts` configuration (where it already isn't — registration happens in a server action, not in the authorize callback).

---

## Don't Hand-Roll

| Problem               | Don't Build                       | Use Instead                                      | Why                                         |
| --------------------- | --------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| Session management    | Custom cookie/JWT code            | Auth.js `signIn()` / `signOut()`                 | Already handles HttpOnly, CSRF, rotation    |
| Password hashing      | Custom crypto                     | `hashPassword()` from `src/lib/auth/password.ts` | Already exists, 12 salt rounds              |
| Loading state         | Custom boolean state              | `useFormStatus().pending`                        | Built-in React 19 — tied to form submission |
| Form error state      | useState + manual tracking        | `useActionState()`                               | Returns server action state cleanly         |
| Redirect after auth   | Manual window.location            | `redirect()` from `next/navigation`              | Server-side, works with App Router          |
| Duplicate email check | Race condition prone custom logic | Single `db.select()` before insert               | Simple and sufficient for this app scale    |

---

## Common Pitfalls

### Pitfall 1: signIn() redirect behavior in server actions

**What goes wrong:** Calling `await signIn('credentials', { email, password })` (without `redirect: false`) causes Auth.js to throw a `NEXT_REDIRECT` error. If this is inside a try/catch, the redirect is swallowed and the user stays on the form.

**Why it happens:** Auth.js `signIn()` triggers a redirect by default using Next.js's `redirect()` internally. The internal redirect throws. If caught, login appears to fail.

**How to avoid:** Always pass `redirect: false` to `signIn()` in server actions, then call `redirect('/')` manually after.

**Warning signs:** Login form stays visible after successful credentials, no redirect happening.

### Pitfall 2: redirect() inside try/catch

**What goes wrong:** `redirect()` from `next/navigation` throws a special `NEXT_REDIRECT` object. If called inside try/catch it gets caught and the redirect never happens.

**Why it happens:** Next.js uses throw-based control flow for redirect/notFound.

**How to avoid:** Always call `redirect()` outside of try/catch blocks. Pattern:

```typescript
let shouldRedirect = false;
try {
  // auth logic...
  shouldRedirect = true;
} catch (error) {
  if (error instanceof AuthError) return { error: "..." };
  throw error;
}
if (shouldRedirect) redirect("/");
```

Or simpler: only catch AuthError, let everything else (including redirect) propagate.

**Warning signs:** redirect() called but page doesn't change; no navigation occurs.

### Pitfall 3: Auth pages inheriting dashboard layout

**What goes wrong:** If `/login` is placed at `src/app/login/page.tsx` (root-level, no route group), it inherits the root layout but not the dashboard layout. However if `/login` is accidentally placed inside `src/app/(dashboard)/login/page.tsx`, it gets the sidebar and header.

**Why it happens:** Forgetting the route group structure.

**How to avoid:** Auth pages go in `src/app/(auth)/` — separate from `(dashboard)`. The `(auth)` route group has its own layout with just the split-panel.

**Warning signs:** Login page shows sidebar/header, or dashboard pages show wrong layout.

### Pitfall 4: useFormStatus must be inside a form component

**What goes wrong:** `useFormStatus().pending` always returns `false` when called in a component that is not a child of a `<form>` element.

**Why it happens:** `useFormStatus` reads context from the nearest parent form.

**How to avoid:** Extract the submit button into its own `SubmitButton` component that is rendered inside the `<form>`. The `SubmitButton` component calls `useFormStatus()`.

**Warning signs:** Spinner never appears, button is never disabled during submission.

### Pitfall 5: Missing /register in proxy.ts matcher exclusion

**What goes wrong:** The `/register` page gets caught by the route protection in `proxy.ts`, causing an infinite redirect loop for unauthenticated users trying to access `/register`.

**Why it happens:** `proxy.ts` already correctly excludes `/register` (verified: `if (pathname === "/login" || pathname === "/register")`). This is already handled — just need to ensure the register page is at exactly `/register`.

**How to avoid:** Confirm `proxy.ts` already handles `/register` exclusion (it does). Place register page at `src/app/(auth)/register/page.tsx` which resolves to `/register`.

**Warning signs:** Visiting /register redirects to /login in a loop.

### Pitfall 6: bcrypt in Edge Runtime

**What goes wrong:** If `hashPassword` is ever imported into a file that runs in Edge Runtime (e.g., auth.ts, proxy.ts), the build fails with "bcrypt is not compatible with Edge Runtime."

**Why it happens:** bcrypt uses Node.js crypto APIs not available in Edge.

**How to avoid:** `hashPassword` is only called in server actions (`registerAction`). Server actions run in Node.js runtime, not Edge. Never import password utilities into `auth.ts` or `proxy.ts`.

**Warning signs:** Build error mentioning Edge Runtime compatibility for bcrypt.

---

## Code Examples

### Complete registerAction with auto-login

```typescript
// Source: Auth.js v5 signIn + redirect pattern
// src/actions/auth-actions.ts
"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validations/auth";

export type AuthActionState = {
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
};

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const result = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) {
    const fieldErrors: AuthActionState["fieldErrors"] = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof NonNullable<typeof fieldErrors>;
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, password } = result.data;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return { fieldErrors: { email: "An account with this email already exists" } };
  }

  const hashedPassword = await hashPassword(password);
  await db.insert(users).values({ email, password: hashedPassword });

  // Auto-login — signIn with redirect:false, then redirect manually
  await signIn("credentials", { email, password, redirect: false });
  redirect("/");
}
```

### logoutAction (server action)

```typescript
// Source: Auth.js v5 signOut pattern
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
```

### useActionState form wiring

```tsx
// Source: React 19 useActionState — https://react.dev/reference/react/useActionState
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type AuthActionState } from "@/actions/auth-actions";

const initialState: AuthActionState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  // Note: useActionState returns [state, dispatch, isPending] in React 19
  // For the submit button spinner, prefer useFormStatus in a child component
  // ...
}
```

---

## State of the Art

| Old Approach                          | Current Approach                   | When Changed     | Impact                                               |
| ------------------------------------- | ---------------------------------- | ---------------- | ---------------------------------------------------- |
| `useFormState` (react-dom)            | `useActionState` (react)           | React 19         | Moved to React core; same API                        |
| Manual form pending state (useState)  | `useFormStatus().pending`          | React 19         | Built-in, tied to nearest form                       |
| `getServerSession()` for client state | `SessionProvider` + `useSession()` | Auth.js v5       | Client components read session without prop drilling |
| Custom form components                | shadcn/ui Input + Label + Button   | Project standard | Already used throughout dashboard                    |

**Deprecated/outdated:**

- `useFormState` from `react-dom`: Renamed to `useActionState` from `react` in React 19. Next.js 15 uses React 19.
- Auth.js `pages.signIn` config: Already set to `"/login"` in `auth.ts` (Phase 1). No changes needed.

---

## Key Observations from Codebase

### Existing Infrastructure (from code review)

1. **`auth.ts`** (project root) — Already configured with Credentials provider, JWT strategy, `pages: { signIn: '/login' }`, `hashPassword`/`verifyPassword` imports. The `authorize()` callback queries the `users` table.

2. **`proxy.ts`** (project root) — Already excludes `/login` and `/register` from protection. Already redirects logged-in users away from auth pages to `/dashboard`. No changes needed.

3. **`src/lib/auth/password.ts`** — `hashPassword()` and `verifyPassword()` with bcrypt, 12 salt rounds. Ready to use.

4. **`src/lib/validations/auth.ts`** — `signInSchema` exists. Needs `registerSchema` added.

5. **`src/components/providers/index.tsx`** — Already `'use client'`, wraps entire tree. This is where `SessionProvider` goes.

6. **`src/app/(dashboard)/layout.tsx`** — Renders `AppSidebar` + `Header` + `FloatingActions`. Auth pages must NOT be inside this route group.

7. **`src/app/page.tsx`** — Redirects `/` to `/dashboard`. Post-auth redirect to `/` will land at `/dashboard` via this redirect.

8. **`src/components/layout/app-sidebar.tsx`** — Client component, SidebarFooter section is the right place for logout button. Currently has version badge in footer. Logout button goes above the version badge or replaces the bottom Tools section.

9. **`src/components/layout/header.tsx`** — Has an Avatar with hardcoded "U" fallback. Could display user initials from session, but this is Claude's discretion territory.

### Design System Tokens for Auth Pages

From `globals.css` — available utilities:

- `.glass` / `.glass-elevated` — glass card for form container
- `.glass-accent` — amber-tinted glass (could use for left panel elements)
- `.vault-grid` — subtle grid background
- `.blob-primary` / `.blob-secondary` — ambient amber glows
- `.gradient-amber-text` — amber gradient text for headings
- `.animate-fade-in-scale` — entrance animation for the card
- CSS vars: `--font-syne` (headings), `--font-jakarta` (body), `#08080a` (dark bg), `#f59e0b` (amber)

---

## Open Questions

1. **Avatar initials in header — use session email?**
   - What we know: Header has `<Avatar>` with hardcoded "U" fallback. Session has `user.email`.
   - What's unclear: Whether to update the avatar to show real user initials (e.g., first letter of email)
   - Recommendation: This is in Claude's discretion. Update to show `session?.user?.email?.[0].toUpperCase()` — simple improvement within Vault aesthetic. Not a blocker for the phase.

2. **signIn() return value on failure**
   - What we know: With `redirect: false`, signIn returns an object or throws `AuthError`
   - What's unclear: Exact Auth.js v5 beta behavior — does it throw `AuthError` or return `{ error: string }`?
   - Recommendation: Wrap in try/catch for `AuthError`. Also handle the case where it returns without throwing by checking the return value. Both patterns should be defensive.

---

## Sources

### Primary (HIGH confidence)

- Auth.js v5 source code in `auth.ts` — Verified actual config, Credentials provider, JWT strategy
- `proxy.ts` source code — Verified `/login` and `/register` exclusions already present
- `src/components/providers/index.tsx` — Verified `'use client'`, existing provider tree
- `src/app/(dashboard)/layout.tsx` — Verified dashboard route group structure
- React 19 docs — `useActionState` and `useFormStatus` hooks (built into Next.js 15)

### Secondary (MEDIUM confidence)

- Auth.js v5 signIn with redirect:false pattern — Standard pattern from authjs.dev
- Next.js App Router route groups — Official Next.js docs pattern for layout separation

### Tertiary (LOW confidence — flag for validation)

- Auth.js v5 beta exact error types for Credentials failure: `AuthError` subclass behavior may vary in beta. Test during implementation.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — All packages already installed, verified in package.json
- Architecture: HIGH — Existing codebase structure fully read and understood
- Auth.js patterns: HIGH — auth.ts and proxy.ts already working, Phase 1 complete
- React 19 form hooks: HIGH — useActionState/useFormStatus are stable React 19 APIs in Next.js 15
- Auth.js v5 beta edge cases: MEDIUM — Some beta behavior (error types) may need validation during impl

**Research date:** 2026-02-24
**Valid until:** 30 days (stable Next.js 15 + React 19 + Auth.js v5 pattern; no fast-moving parts)
