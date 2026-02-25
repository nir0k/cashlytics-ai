# Phase 11: Reset Flow Pages - Research

**Researched:** 2026-02-25
**Domain:** Password reset UI pages, form components, client-side routing with URL parameters
**Confidence:** HIGH

## Summary

Phase 11 implements the UI pages for the password reset flow: adding "Forgot password?" link to login page, creating forgot-password page (email input), and reset-password page (token validation + new password). The pages must match the existing auth page patterns exactly — centered glass card layout, useActionState with server actions, inline field validation errors, and full dark/light theme support.

**Primary recommendation:** Follow the existing LoginForm and RegisterForm patterns exactly. Create ForgotPasswordForm and ResetPasswordForm organisms. Use the existing `forgotPasswordAction` from Phase 10. Note: `resetPasswordAction` from Phase 10-02 is NOT YET IMPLEMENTED — this phase may need to implement it or depend on Phase 10 completion.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page layout & styling:**

- Match existing login/register page style exactly — centered card layout
- Same form width as login page for consistency
- Full dark/light theme support with theme toggle
- Match login page decorative elements (background, visual treatment)

**Form feedback:**

- Inline validation errors below each field (not toast)
- On forgot-password success: redirect to login page (no in-page success state)
- Loading state: submit button shows spinner and becomes disabled
- Standard form validation patterns from existing auth pages

**Token error handling:**

- Show error directly on reset-password page (don't redirect away)
- Unified error message: "This reset link is invalid or has expired" — no distinction between invalid/expired/used
- Provide link to forgot-password page for recovery action
- No auto-send new token — user must request again manually

**Post-reset flow:**

- Redirect to login page after successful password reset
- Toast notification on login page: "Password reset successful, please log in"
- Auto-fill email on login page via URL param (e.g., `?email=user@example.com`)
- Clear reset token from URL after processing

### Claude's Discretion

- Exact toast implementation (position, duration, styling)
- Email validation regex/pattern (match existing)
- Password strength requirements display (match register page)
- Error message styling and iconography

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core (Already in Project)

| Library                 | Version    | Purpose                         | Why Standard                              |
| ----------------------- | ---------- | ------------------------------- | ----------------------------------------- |
| Next.js App Router      | 16.x       | File-based routing, page.tsx    | Already in use for all pages              |
| React useActionState    | 19.x       | Form state with server actions  | Used in login-form.tsx, register-form.tsx |
| react-dom useFormStatus | 19.x       | Pending state for submit button | Used in existing auth forms               |
| zod                     | (existing) | Input validation                | Used in auth-actions.ts                   |
| sonner                  | (existing) | Toast notifications             | Included in providers/index.tsx           |

### Existing Components to Reuse

| Component      | Location                     | Purpose                     |
| -------------- | ---------------------------- | --------------------------- |
| Input          | src/components/ui/input.tsx  | Form input field            |
| Button         | src/components/ui/button.tsx | Submit button               |
| Label          | src/components/ui/label.tsx  | Field labels                |
| Loader2        | lucide-react                 | Loading spinner             |
| Auth Layout    | src/app/(auth)/layout.tsx    | Glass card + branding panel |
| toast (sonner) | src/components/ui/sonner.tsx | Post-reset notification     |

### Server Actions (from Phase 10)

| Action               | Location                    | Status              |
| -------------------- | --------------------------- | ------------------- |
| forgotPasswordAction | src/actions/auth-actions.ts | IMPLEMENTED         |
| resetPasswordAction  | src/actions/auth-actions.ts | NOT YET IMPLEMENTED |

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/(auth)/
│   ├── login/page.tsx              # Add "Forgot password?" link
│   ├── forgot-password/page.tsx    # NEW: Email input page
│   ├── reset-password/page.tsx     # NEW: Token validation + password reset
│   └── layout.tsx                  # Existing glass card layout
├── components/organisms/
│   ├── login-form.tsx              # MODIFY: Add forgot password link
│   ├── forgot-password-form.tsx    # NEW: Email form component
│   └── reset-password-form.tsx     # NEW: Password reset form component
└── actions/
    └── auth-actions.ts             # Has forgotPasswordAction, needs resetPasswordAction
```

### Pattern 1: Auth Form Component Structure

**What:** All auth forms follow the same structure: "use client" component, useActionState hook, SubmitButton with useFormStatus, inline field errors.

**When to use:** All auth-related form components.

**Example (from login-form.tsx):**

```tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type AuthActionState } from "@/actions/auth-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-amber-500 font-semibold text-black transition-all hover:bg-amber-400"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        "Sign in"
      )}
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState);

  return (
    <div className="w-full max-w-sm">
      {/* Logo above card */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <Image
          src="/logo.svg"
          alt="Cashlytics"
          width={140}
          height={35}
          className="h-8 w-auto dark:brightness-0 dark:invert"
          priority
        />
      </div>

      {/* Glass card */}
      <div className="glass-elevated rounded-2xl p-8">
        <h1
          className="mb-1 text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Welcome back
        </h1>
        <p className="text-muted-foreground/70 mb-6 text-sm">Sign in to your account</p>

        {/* Global error */}
        {state.error && (
          <div className="bg-destructive/10 border-destructive/20 mb-4 rounded-lg border px-4 py-3">
            <p className="text-destructive text-sm">{state.error}</p>
          </div>
        )}

        <form action={action} className="space-y-4">
          {/* Form fields with inline errors */}
        </form>
      </div>

      {/* Footer link */}
    </div>
  );
}
```

### Pattern 2: URL Parameter Handling for Email Auto-fill

**What:** After password reset, redirect to login with email in URL params. Login page reads param and pre-fills email field.

**When to use:** Post-reset redirect to login page.

**Implementation:**

```tsx
// reset-password-form.tsx - on success
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// In component, after state.success:
useEffect(() => {
  if (state.success) {
    const email = /* get email from form state */;
    router.push(`/login?reset=success&email=${encodeURIComponent(email)}`);
  }
}, [state.success, router]);

// login-form.tsx - read params
"use client";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const prefilledEmail = searchParams.get("email") || "";

  // Show toast on mount if reset success
  useEffect(() => {
    if (resetSuccess) {
      toast.success("Password reset successful, please log in");
    }
  }, [resetSuccess]);

  // Use prefilledEmail as default value for email input
}
```

### Pattern 3: Token Handling in Reset Password Page

**What:** Reset password page extracts token from URL, validates on form submit, shows error inline if invalid.

**When to use:** Reset password page.

**Implementation:**

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { resetPasswordAction } from "@/actions/auth-actions";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  // Form submits token as hidden field
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      {/* Password fields */}
    </form>
  );
}
```

### Anti-Patterns to Avoid

- **Using toast for form validation errors:** Use inline errors below fields, matching existing auth forms
- **Different card styling:** Must use `glass-elevated rounded-2xl p-8` exactly
- **In-page success state for forgot-password:** Redirect to login immediately
- **Redirecting away from reset-password on token error:** Show error on same page
- **Auto-login after password reset:** OWASP recommends against this, redirect to login

## Don't Hand-Roll

| Problem                     | Don't Build         | Use Instead                             | Why                             |
| --------------------------- | ------------------- | --------------------------------------- | ------------------------------- |
| Form state management       | Custom useState     | useActionState                          | Already used in auth forms      |
| Submit button pending state | Custom loading prop | useFormStatus hook                      | Standard pattern                |
| Toast notifications         | Custom alert        | sonner toast                            | Already in providers            |
| Glass card styling          | Custom CSS          | glass-elevated class                    | Already defined                 |
| Password validation         | Custom regex        | registerSchema from validations/auth.ts | Consistent rules                |
| Email validation            | Custom regex        | z.string().email()                      | Already in forgotPasswordSchema |

## Common Pitfalls

### Pitfall 1: Missing "use client" Directive

**What goes wrong:** Server component tries to use hooks like useActionState, useSearchParams.

**Why it happens:** Forgetting that form components must be client components.

**How to avoid:** All form organisms start with `"use client";`. Page components can remain server components.

**Warning signs:** Error about hooks being called outside client component.

### Pitfall 2: Token Not Passed to Server Action

**What goes wrong:** resetPasswordAction receives undefined or empty token.

**Why it happens:** Forgetting to include token as hidden form field or not extracting from URL.

**How to avoid:** Always include `<input type="hidden" name="token" value={token} />` in form.

**Warning signs:** Token validation always fails with "invalid or expired" error.

### Pitfall 3: useSearchParams Causing Static Rendering

**What goes wrong:** Page with useSearchParams doesn't render correctly or causes build issues.

**Why it happens:** useSearchParams requires Suspense boundary in Next.js App Router.

**How to avoid:** Wrap form in Suspense boundary or ensure page is dynamically rendered.

```tsx
// page.tsx
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/organisms/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
```

**Warning signs:** Page renders blank or with hydration errors.

### Pitfall 4: Email Not URL-Encoded in Redirect

**What goes wrong:** Email with special characters (+, .) breaks redirect URL.

**Why it happens:** Forgetting to encodeURIComponent when building URL.

**How to avoid:** Always use `encodeURIComponent(email)` when adding to URL params.

**Warning signs:** Emails with + sign don't pre-fill correctly.

### Pitfall 5: Toast Not Showing After Redirect

**What goes wrong:** Success toast doesn't appear on login page after redirect.

**Why it happens:** Component mounts before URL params are available, or toast library not properly initialized.

**How to avoid:** Use useEffect with dependency on searchParams to trigger toast.

**Warning signs:** Toast works on direct page load but not after redirect.

## Code Examples

### ForgotPasswordForm Component

```tsx
// src/components/organisms/forgot-password-form.tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { forgotPasswordAction, type ForgotPasswordState } from "@/actions/auth-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const initialState: ForgotPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-amber-500 font-semibold text-black transition-all hover:bg-amber-400"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : (
        "Send reset link"
      )}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const [state, action] = useActionState(forgotPasswordAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.push("/login");
    }
  }, [state.success, router]);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3">
        <Image
          src="/logo.svg"
          alt="Cashlytics"
          width={140}
          height={35}
          className="h-8 w-auto dark:brightness-0 dark:invert"
          priority
        />
      </div>

      <div className="glass-elevated rounded-2xl p-8">
        <h1
          className="mb-1 text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Reset password
        </h1>
        <p className="text-muted-foreground/70 mb-6 text-sm">
          Enter your email to receive a reset link
        </p>

        {state.error && (
          <div className="bg-destructive/10 border-destructive/20 mb-4 rounded-lg border px-4 py-3">
            <p className="text-destructive text-sm">{state.error}</p>
          </div>
        )}

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <div className="pt-1">
            <SubmitButton />
          </div>
        </form>
      </div>

      <p className="text-muted-foreground mt-4 text-center text-sm">
        Remember your password?{" "}
        <Link
          href="/login"
          className="text-amber-500 underline-offset-4 transition-colors hover:text-amber-400 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

### ResetPasswordForm Component

```tsx
// src/components/organisms/reset-password-form.tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { resetPasswordAction, type ResetPasswordState } from "@/actions/auth-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

const initialState: ResetPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-amber-500 font-semibold text-black transition-all hover:bg-amber-400"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Resetting...
        </>
      ) : (
        "Reset password"
      )}
    </Button>
  );
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [state, action] = useActionState(resetPasswordAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Password reset successful, please log in");
      router.push("/login");
    }
  }, [state.success, router]);

  if (!token) {
    return (
      <div className="w-full max-w-sm">
        <div className="glass-elevated rounded-2xl p-8">
          <div className="bg-destructive/10 border-destructive/20 rounded-lg border px-4 py-3">
            <p className="text-destructive text-sm">This reset link is invalid or has expired.</p>
          </div>
          <p className="text-muted-foreground mt-4 text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-amber-500 underline-offset-4 hover:underline"
            >
              Request a new reset link
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3">
        <Image
          src="/logo.svg"
          alt="Cashlytics"
          width={140}
          height={35}
          className="h-8 w-auto dark:brightness-0 dark:invert"
          priority
        />
      </div>

      <div className="glass-elevated rounded-2xl p-8">
        <h1
          className="mb-1 text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Set new password
        </h1>
        <p className="text-muted-foreground/70 mb-6 text-sm">Enter your new password below</p>

        {state.error && (
          <div className="bg-destructive/10 border-destructive/20 mb-4 rounded-lg border px-4 py-3">
            <p className="text-destructive text-sm">{state.error}</p>
            <Link
              href="/forgot-password"
              className="text-sm text-amber-500 underline-offset-4 hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
        )}

        <form action={action} className="space-y-4">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
            />
            <p className="text-muted-foreground/60 text-xs">
              Min. 8 characters, at least one number
            </p>
            {state.fieldErrors?.password && (
              <p className="text-destructive text-xs">{state.fieldErrors.password}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
            />
            {state.fieldErrors?.confirmPassword && (
              <p className="text-destructive text-xs">{state.fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div className="pt-1">
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach               | Current Approach         | When Changed       | Impact                |
| -------------------------- | ------------------------ | ------------------ | --------------------- |
| Custom form state          | useActionState hook      | React 19           | Cleaner form handling |
| Separate success pages     | Redirect with URL params | Next.js App Router | Better UX flow        |
| Server-side redirects only | Client-side router.push  | Next.js 13+        | Smoother transitions  |
| Alert() for notifications  | Toast (sonner)           | Modern apps        | Better UX             |

**Deprecated/outdated:**

- Using window.location for redirects: Use Next.js router.push
- Custom form validation state: Use useActionState with server actions

## Open Questions

1. **Should resetPasswordAction be implemented as part of this phase or Phase 10?**
   - What we know: Phase 10-02 PLAN exists but resetPasswordAction is not in auth-actions.ts
   - Recommendation: Check Phase 10 completion status. If 10-02 is not done, this phase may need to implement it or block on Phase 10 completion.

2. **Should login page email auto-fill work without JavaScript?**
   - What we know: useSearchParams requires client-side JavaScript
   - Recommendation: Accept JS requirement for auth flow, it's standard for SPAs

## Sources

### Primary (HIGH confidence)

- Existing codebase patterns: login-form.tsx, register-form.tsx, auth-actions.ts
- Phase 10 RESEARCH.md - server action patterns
- Phase 10-02 PLAN.md - resetPasswordAction specification

### Secondary (MEDIUM confidence)

- Next.js App Router docs - useSearchParams with Suspense
- sonner documentation - toast API

### Tertiary (codebase inspection)

- src/app/(auth)/layout.tsx - glass card structure
- src/components/ui/sonner.tsx - toast configuration
- src/hooks/use-toast.ts - alternative toast system (not used for this phase per CONTEXT.md)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All components and patterns exist in codebase
- Architecture: HIGH - Existing auth forms provide clear patterns to follow
- Pitfalls: HIGH - Common Next.js/React issues with known solutions

**Research date:** 2026-02-25
**Valid until:** 90 days (stable patterns)

---

<phase_requirements>

## Phase Requirements

| ID       | Description                                                               | Research Support                                                                                          |
| -------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| RESET-02 | "Forgot password?" link is visible on login page                          | Modify login-form.tsx to add Link component below submit button, matching existing "Register" link style  |
| RESET-01 | User can request password reset via forgot-password page with email field | Create forgot-password/page.tsx and ForgotPasswordForm organism, use forgotPasswordAction from Phase 10   |
| RESET-08 | User can reset password via /reset-password?token=... page                | Create reset-password/page.tsx and ResetPasswordForm organism, requires resetPasswordAction (Phase 10-02) |
| RESET-09 | Invalid or expired tokens show clear error message                        | ResetPasswordForm shows inline error with link to forgot-password page                                    |

**Note:** RESET-01, RESET-07, RESET-08, RESET-09 are assigned to Phase 10 per REQUIREMENTS.md but Phase 10 only implemented forgotPasswordAction. resetPasswordAction (10-02) may need completion as part of or before this phase.

</phase_requirements>
