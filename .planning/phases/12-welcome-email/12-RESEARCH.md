# Phase 12: Welcome Email - Research

**Researched:** 2026-02-25
**Domain:** Non-blocking email integration in server actions
**Confidence:** HIGH

## Summary

This phase integrates welcome email sending into the existing `registerAction`. The implementation is straightforward because Phase 7 (SMTP Infrastructure) and Phase 8 (Email Templates) are complete. The key challenge is ensuring non-blocking behavior and graceful failure handling so email issues never prevent user registration.

**Primary recommendation:** Follow the existing `forgotPasswordAction` pattern — check `isEmailConfigured()`, wrap in try-catch, log errors silently, continue regardless of outcome.

## Phase Requirements

| ID         | Description                                       | Research Support                                                                                               |
| ---------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| WELCOME-01 | Welcome email sent after successful registration  | `renderWelcomeEmail()` exists in `src/emails/index.tsx:32`, `sendEmail()` in `src/lib/email/transporter.ts:71` |
| WELCOME-02 | Registration doesn't wait for email               | Fire-and-forget with try-catch — no `await` on the result path, errors caught and logged                       |
| WELCOME-03 | Email failure doesn't affect registration success | Pattern established in `forgotPasswordAction` at `src/actions/auth-actions.ts:173-176`                         |

## Standard Stack

### Core (Already Implemented)

| Library             | Location                          | Purpose                  | Status             |
| ------------------- | --------------------------------- | ------------------------ | ------------------ |
| nodemailer          | `src/lib/email/transporter.ts`    | SMTP transport           | Complete (Phase 7) |
| @react-email/render | `src/emails/index.tsx`            | HTML/plaintext rendering | Complete (Phase 8) |
| renderWelcomeEmail  | `src/emails/index.tsx:32`         | Welcome email renderer   | Complete (Phase 8) |
| sendEmail           | `src/lib/email/transporter.ts:71` | Email sending wrapper    | Complete (Phase 7) |
| isEmailConfigured   | `src/lib/email/transporter.ts:39` | SMTP availability check  | Complete (Phase 7) |

### No New Dependencies Required

All infrastructure exists. This phase only integrates existing components.

## Architecture Patterns

### Pattern: Non-Blocking Email with Graceful Degradation

**What:** Send email without blocking the response, silently handle failures
**When:** Any email triggered by user action that shouldn't fail the action
**Example (from `forgotPasswordAction` lines 159-177):**

```typescript
// Only send email if user exists AND SMTP is configured
if (user && isEmailConfigured()) {
  try {
    const { html, text, subject } = await renderResetPasswordEmail(resetUrl);
    await sendEmail({ to: user.email, subject, html, text });
  } catch (error) {
    // Log errors but don't reveal to user
    logger.error("Failed to send password reset email", "auth", error);
  }
}
// ALWAYS return success regardless of email outcome
return { success: true, message: "..." };
```

### Pattern: Integration Point in registerAction

**Current flow (lines 69-126):**

1. Check registration mode
2. Validate input
3. Check for existing user
4. Insert user
5. Auto-login
6. Redirect

**Integration point:** After user insert (line 110), before auto-login. Email send should happen in parallel or after, but errors must not affect auto-login.

### Recommended Implementation

```typescript
// After db.insert at line 110, add:

// Send welcome email (non-blocking, failures ignored)
if (isEmailConfigured()) {
  const displayName = result.data.email.split("@")[0];
  renderWelcomeEmail(displayName)
    .then(({ html, text, subject }) => sendEmail({ to: result.data.email, subject, html, text }))
    .catch((error) => {
      logger.error("Failed to send welcome email", "auth", error);
    });
}
```

**Key decisions:**

1. **User name source:** Use email local part (before @) since `name` field is optional and not collected during registration
2. **Fire-and-forget:** Don't await the promise chain — let it run independently
3. **No await:** Using `.then()/.catch()` pattern instead of `await` ensures registration continues immediately

## Don't Hand-Roll

| Problem              | Don't Build       | Use Instead                         | Why                                  |
| -------------------- | ----------------- | ----------------------------------- | ------------------------------------ |
| Email sending        | Custom SMTP logic | `sendEmail()` from Phase 7          | Handles config, errors, logging      |
| Email rendering      | Manual HTML       | `renderWelcomeEmail()` from Phase 8 | Branded template, plaintext fallback |
| Graceful degradation | Feature flags     | `isEmailConfigured()` check         | Already implemented pattern          |

## Common Pitfalls

### Pitfall 1: Awaiting Email Send

**What goes wrong:** Registration response blocked by SMTP latency or timeout
**Why it happens:** Using `await sendEmail()` makes the action wait
**How to avoid:** Use `.then()/.catch()` or call without awaiting
**Warning signs:** Slow registration when SMTP is slow/unreachable

### Pitfall 2: Throwing on Email Failure

**What goes wrong:** User can't register if email fails
**Why it happens:** Uncaught exception bubbles up to action boundary
**How to avoid:** Always wrap in try-catch (if using await) or .catch() (if fire-and-forget)
**Warning signs:** Registration fails with SMTP errors

### Pitfall 3: Missing Name Field

**What goes wrong:** `userName` is undefined, email shows "Hi undefined"
**Why it happens:** Registration form doesn't collect name, `name` field is optional in DB
**How to avoid:** Derive name from email local part as fallback
**Warning signs:** "Hi undefined" in welcome emails

## Code Examples

### Complete Integration Pattern

```typescript
// In registerAction, after successful db.insert (line 110)

// Send welcome email (non-blocking, failures ignored)
if (isEmailConfigured()) {
  const userName = email.split("@")[0]; // e.g., "john" from "john@example.com"
  renderWelcomeEmail(userName)
    .then(({ html, text, subject }) => sendEmail({ to: email, subject, html, text }))
    .catch((error) => {
      logger.error("Failed to send welcome email", "auth", error);
    });
}
```

### Required Imports

```typescript
import { isEmailConfigured, sendEmail } from "@/lib/email/transporter";
import { renderWelcomeEmail } from "@/emails";
import { logger } from "@/lib/logger";
```

Note: `isEmailConfigured` and `sendEmail` are already imported (line 12). Only `renderWelcomeEmail` needs to be added to the `@/emails` import.

## Open Questions

### 1. User Name Resolution Strategy

**What we know:** `users.name` is optional, registration form only collects email/password
**What's unclear:** Should we derive name from email, use generic greeting, or add name to registration?
**Recommendation:** Derive from email local part (`email.split("@")[0]`) — simple, personal enough, matches welcome template expectation

## Sources

### Primary (HIGH confidence)

- `src/actions/auth-actions.ts` - Existing patterns for email integration
- `src/lib/email/transporter.ts` - Email sending infrastructure
- `src/emails/index.tsx` - Welcome email renderer
- `src/lib/logger.ts` - Error logging pattern

### Project Patterns (HIGH confidence)

- `forgotPasswordAction` pattern at lines 159-177 is the canonical non-blocking email pattern

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All dependencies already implemented
- Architecture: HIGH - Clear pattern from forgotPasswordAction
- Pitfalls: HIGH - Common async/await mistakes, well-documented

**Research date:** 2026-02-25
**Valid until:** Stable - patterns are established in codebase
