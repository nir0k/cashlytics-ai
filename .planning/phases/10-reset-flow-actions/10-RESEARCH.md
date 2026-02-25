# Phase 10: Reset Flow Actions - Research

**Researched:** 2026-02-25
**Domain:** Password reset server actions, email enumeration prevention, secure token handling
**Confidence:** HIGH

## Summary

Phase 10 implements the server actions for password reset: `forgotPasswordAction` and `resetPasswordAction`. These actions integrate with existing infrastructure from Phase 7 (SMTP/email sending), Phase 8 (email templates), and Phase 9 (token lifecycle). The critical security requirement is email enumeration prevention — the forgot-password action must return identical responses whether the email exists or not.

**Primary recommendation:** Follow existing `AuthActionState` pattern from `auth-actions.ts`, use `useActionState` hook for form handling, and implement timing-safe responses for forgot-password to prevent user enumeration attacks.

## Standard Stack

### Core (Already in Project)

| Library                | Version    | Purpose                      | Why Standard                                            |
| ---------------------- | ---------- | ---------------------------- | ------------------------------------------------------- |
| Next.js Server Actions | 16.x       | Form handling with mutations | Native Next.js pattern, already used in auth-actions.ts |
| zod                    | (existing) | Input validation             | Already used in validations/auth.ts                     |
| bcrypt                 | 6.0.0      | Password hashing             | Already in password.ts                                  |
| nodemailer             | ^8.0.1     | Email sending                | From Phase 7, transporter.ts                            |

### Existing Infrastructure (Dependencies)

| Module                     | Location                     | What It Provides                        |
| -------------------------- | ---------------------------- | --------------------------------------- |
| `sendEmail`                | src/lib/email/transporter.ts | Email sending with graceful degradation |
| `isEmailConfigured`        | src/lib/email/transporter.ts | Check if SMTP is available              |
| `renderResetPasswordEmail` | src/emails/index.tsx         | HTML/plaintext email rendering          |
| `createResetToken`         | src/lib/auth/reset-token.ts  | Generate and store token hash           |
| `validateResetToken`       | src/lib/auth/reset-token.ts  | Validate token with single query        |
| `consumeResetToken`        | src/lib/auth/reset-token.ts  | Mark token as used                      |
| `invalidateUserTokens`     | src/lib/auth/reset-token.ts  | Invalidate all user tokens              |
| `hashPassword`             | src/lib/auth/password.ts     | Hash new password with bcrypt           |
| `db`                       | src/lib/db/index.ts          | Drizzle database connection             |

## Architecture Patterns

### Pattern 1: Server Action with useActionState

**What:** Form actions use React's `useActionState` hook for state management, following the pattern in `login-form.tsx` and `register-form.tsx`.

**When to use:** All auth-related form actions that need error/success state.

**Example (from existing codebase):**

```typescript
// src/actions/auth-actions.ts
export type AuthActionState = {
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
};

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  // ... validation and logic
}
```

```tsx
// Component usage (login-form.tsx)
const [state, action] = useActionState(loginAction, initialState);
```

### Pattern 2: Email Enumeration Prevention

**What:** Forgot-password action returns identical success response regardless of whether email exists in database. Timing must be uniform to prevent timing attacks.

**When to use:** Any endpoint that could reveal user existence.

**Implementation approach:**

```typescript
export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get("email") as string;

  // Always return success, even if email doesn't exist
  // Only send email if user exists AND SMTP is configured

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (user && isEmailConfigured()) {
    // Generate token, send email - but don't await in critical path
    // or use same timing for non-existent users
    const rawToken = await createResetToken(user.id);
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${rawToken}`;
    const { html, text, subject } = await renderResetPasswordEmail(resetUrl);
    await sendEmail({ to: email, subject, html, text });
  }

  // ALWAYS return same message
  return { success: true, message: "If an account exists, a reset email has been sent." };
}
```

### Pattern 3: Token Validation with Single Query

**What:** Token validation combines all conditions (hash match, not expired, not used) in a single database query to prevent timing attacks.

**When to use:** Already implemented in Phase 9 — consume this function.

**Existing implementation (Phase 9):**

```typescript
// validateResetToken uses single query with and():
// - eq(passwordResetTokens.tokenHash, tokenHash)
// - gt(passwordResetTokens.expiresAt, new Date())
// - isNull(passwordResetTokens.usedAt)
```

### Anti-Patterns to Avoid

- **Returning different messages for valid/invalid emails:** Allows user enumeration
- **Timing variance between existing/non-existing users:** Enables timing attacks
- **Sequential condition checks:** Use combined query from Phase 9
- **Auto-login after password reset:** OWASP recommends against this
- **Locking accounts on failed reset attempts:** Can be used for DoS

## Don't Hand-Roll

| Problem          | Don't Build           | Use Instead                         | Why                         |
| ---------------- | --------------------- | ----------------------------------- | --------------------------- |
| Token generation | Custom random strings | `createResetToken()` from Phase 9   | Crypto-safe, already hashes |
| Token validation | Multiple DB queries   | `validateResetToken()` from Phase 9 | Timing-safe single query    |
| Password hashing | Custom crypto         | `hashPassword()` from password.ts   | bcrypt with proper rounds   |
| Email sending    | Direct nodemailer     | `sendEmail()` from Phase 7          | Graceful degradation        |
| Email rendering  | Manual HTML           | `renderResetPasswordEmail()`        | Branded template ready      |

## Common Pitfalls

### Pitfall 1: Email Enumeration via Response

**What goes wrong:** Returning "Email not found" vs "Email sent" reveals which emails have accounts.

**Why it happens:** Developers want to be helpful and inform users when their email isn't registered.

**How to avoid:** Always return identical message: "If an account exists with this email, you will receive a reset link."

**Warning signs:** Any conditional logic that changes the response message based on user existence.

### Pitfall 2: Email Enumeration via Timing

**What goes wrong:** Response time differs significantly between existing and non-existing users (e.g., email sending takes 500ms only for real users).

**Why it happens:** Email sending is async and only happens for real users.

**How to avoid:**

- Option A: Always perform email rendering work (even for fake emails)
- Option B: Add artificial delay to match email-sending time
- Option C: Use fire-and-forget for email sending (but still be careful)

**Warning signs:** Measurable timing difference (>100ms) between valid/invalid email submissions.

### Pitfall 3: Token Leakage in Logs/Errors

**What goes wrong:** Raw tokens appear in error messages or server logs.

**Why it happens:** Error objects include full context, logging middleware captures request params.

**How to avoid:** Never log the raw token. Only log token IDs or hashed values. Use generic error messages.

**Warning signs:** Any `console.log(token)` or error messages containing the reset URL.

### Pitfall 4: Missing SMTP Graceful Degradation

**What goes wrong:** App crashes or shows errors when SMTP isn't configured.

**Why it happens:** Assuming email will always send successfully.

**How to avoid:** Check `isEmailConfigured()` before attempting to send. Handle `sendEmail` returning `{ success: false }`.

**Warning signs:** Forgot-password action throws when SMTP is not configured.

### Pitfall 5: Not Invalidating Old Tokens

**What goes wrong:** After password reset, old reset links still work.

**Why it happens:** Forgetting to call `invalidateUserTokens()` after successful reset.

**How to avoid:** Call `invalidateUserTokens(userId)` after updating password to invalidate all pending tokens.

**Warning signs:** Multiple reset links for same user remain valid.

## Code Examples

### forgotPasswordAction Structure

```typescript
// src/actions/auth-actions.ts (extension)

export type ForgotPasswordState = {
  success?: boolean;
  message?: string;
  error?: string;
};

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get("email") as string;

  // 1. Validate email format
  const result = z.string().email().safeParse(email);
  if (!result.success) {
    return { error: "Please enter a valid email address" };
  }

  // 2. Look up user (quietly)
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // 3. If user exists AND SMTP configured, send email
  if (user && isEmailConfigured()) {
    try {
      const rawToken = await createResetToken(user.id);
      const resetUrl = `${process.env.APP_URL}/reset-password?token=${rawToken}`;
      const { html, text, subject } = await renderResetPasswordEmail(resetUrl);
      await sendEmail({ to: user.email, subject, html, text });
    } catch (error) {
      // Log but don't reveal to user
      logger.error("Failed to send reset email", "auth", error);
    }
  }

  // 4. ALWAYS return same message
  return {
    success: true,
    message: "If an account exists with this email, you will receive a reset link.",
  };
}
```

### resetPasswordAction Structure

```typescript
// src/actions/auth-actions.ts (extension)

export type ResetPasswordState = {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    password?: string;
    confirmPassword?: string;
  };
};

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // 1. Validate password match
  if (password !== confirmPassword) {
    return { fieldErrors: { confirmPassword: "Passwords do not match" } };
  }

  // 2. Validate password strength (reuse registerSchema logic)
  const passwordResult = z.string().min(8).regex(/\d/).safeParse(password);
  if (!passwordResult.success) {
    return { fieldErrors: { password: "Password must be at least 8 characters with a number" } };
  }

  // 3. Validate token (single query, timing-safe)
  const validation = await validateResetToken(token);
  if (!validation.valid) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }

  // 4. Hash new password
  const hashedPassword = await hashPassword(password);

  // 5. Update user's password
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, validation.userId));

  // 6. Mark token as used
  await consumeResetToken(validation.tokenId);

  // 7. Invalidate all other tokens for this user
  await invalidateUserTokens(validation.userId);

  // 8. Return success (redirect to login handled by component)
  return { success: true };
}
```

## State of the Art

| Old Approach                 | Current Approach             | When Changed   | Impact                   |
| ---------------------------- | ---------------------------- | -------------- | ------------------------ |
| Security questions for reset | Token-based via side-channel | ~2015+         | Questions were guessable |
| "Email not found" errors     | Generic success message      | OWASP guidance | Prevents enumeration     |
| Database session lookup      | Single combined query        | Phase 9        | Prevents timing attacks  |
| Auto-login after reset       | Redirect to login            | OWASP guidance | Reduces attack surface   |

**Deprecated/outdated:**

- Security questions as sole reset mechanism: Easily guessable, not recommended
- Displaying whether email exists: User enumeration vulnerability

## Open Questions

1. **Should forgotPasswordAction validate email format before checking DB?**
   - What we know: Invalid emails should fail fast
   - Recommendation: Yes, use zod email validation, return error only for format issues (not for non-existence)

2. **Should reset password form include password confirmation field?**
   - What we know: OWASP recommends confirmation
   - Recommendation: Yes, follow same pattern as register form with `confirmPassword` field

3. **Should we redirect automatically after successful reset?**
   - What we know: OWASP says don't auto-login
   - Recommendation: Return `{ success: true }` and let component redirect to /login

## Sources

### Primary (HIGH confidence)

- OWASP Forgot Password Cheat Sheet - https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html (enumeration prevention, token handling)
- Next.js Server Actions docs - https://nextjs.org/docs/app/getting-started/updating-data (useActionState pattern)

### Secondary (MEDIUM confidence)

- Existing codebase patterns: auth-actions.ts, login-form.tsx, register-form.tsx
- Phase 7 SMTP infrastructure: transporter.ts
- Phase 9 Token security: reset-token.ts

### Tertiary (codebase inspection)

- src/lib/db/schema.ts - passwordResetTokens table structure
- src/emails/index.tsx - renderResetPasswordEmail function
- src/lib/auth/password.ts - hashPassword function

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All dependencies already in project
- Architecture: HIGH - Existing patterns in auth-actions.ts to follow
- Pitfalls: HIGH - OWASP guidance is clear and well-established

**Research date:** 2026-02-25
**Valid until:** 90 days (stable patterns)

---

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                                     | Research Support                                                            |
| -------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| RESET-01 | User can request password reset via forgot-password page with email field                       | forgotPasswordAction pattern, useActionState form handling                  |
| RESET-07 | Forgot-password action always returns identical success response (email enumeration prevention) | OWASP guidance, timing-safe implementation pattern                          |
| RESET-08 | User can reset password via /reset-password?token=... page                                      | resetPasswordAction pattern, validateResetToken from Phase 9                |
| RESET-09 | Invalid or expired tokens show clear error message                                              | validateResetToken returns `{ valid: false }`, single error message pattern |

</phase_requirements>
