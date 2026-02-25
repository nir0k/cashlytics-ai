# Feature Research: Email Sending and Password Reset Flow

**Domain:** SMTP Email Infrastructure + Password Reset + Welcome Email for Next.js Self-Hosted Financial App
**Researched:** 2026-02-25
**Confidence:** HIGH (based on codebase analysis, established security patterns, and standard Next.js App Router patterns)

---

## Context: What Already Exists

This is a subsequent milestone on top of a working auth system. Key existing infrastructure:

- Auth.js v5 credentials provider (email + password login/register)
- `bcrypt` password hashing (pure JS, Docker-friendly)
- `users` table with `id`, `email`, `password`, `emailVerified`, `createdAt`
- `authVerificationTokens` table (Auth.js standard — identifier + token + expires, composite PK)
- In-memory `rateLimit()` utility in `src/lib/rate-limiter.ts`
- Server Actions pattern: `useActionState` + `AuthActionState` type with `error` + `fieldErrors`
- Auth layout: two-panel design with Vault glass card (dark `#08080a`, amber `#f59e0b`)
- No email library installed yet (Nodemailer not in package.json)

The `authVerificationTokens` table is Auth.js adapter-owned and not suitable for password reset — it lacks a `userId` FK and a `usedAt` column. A dedicated `passwordResetTokens` table is required.

---

## Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or insecure.

| Feature                                   | Why Expected                                                                               | Complexity | Notes                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------- |
| **Forgot-Password page**                  | Every auth system has a "Forgot password?" link from the login page                        | LOW        | Page at `/forgot-password`; single email field; submits to server action      |
| **"Forgot password?" link on login page** | Users expect this affordance; its absence signals a broken product                         | LOW        | Add link below login form pointing to `/forgot-password`                      |
| **Password reset email delivery**         | Users expect to receive a reset link via email                                             | MEDIUM     | Nodemailer via SMTP; plain HTML email with reset link                         |
| **Reset-password page (token-based)**     | Link in email must lead to a usable form                                                   | LOW        | Page at `/reset-password?token=...`; new password + confirm                   |
| **Token expiry**                          | Security expectation: reset links expire (standard: 1 hour)                                | LOW        | `expiresAt` column; server action checks before accepting                     |
| **One-time token use**                    | Security expectation: used tokens cannot be reused                                         | LOW        | `usedAt` column set on consumption; check before processing                   |
| **Secure random token generation**        | Tokens must be cryptographically random, not guessable                                     | LOW        | `crypto.randomBytes(32).toString('hex')` — Node.js built-in, no extra library |
| **Token stored as hash in DB**            | Tokens in DB should not be reversible if DB is leaked                                      | MEDIUM     | Store `sha256(token)` in DB; compare hash of submitted token                  |
| **Graceful "email not found" behavior**   | Always respond "if this email exists, a reset email was sent" — prevents email enumeration | LOW        | Never reveal whether email exists in DB                                       |
| **Welcome email on registration**         | Users expect a confirmation after signup                                                   | LOW        | Triggered in `registerAction` after user creation; async send                 |
| **HTML email with brand identity**        | Transactional email that looks like the app (not plain text)                               | MEDIUM     | Inline-styled HTML; Vault dark background + amber accent                      |

---

## Differentiators (Competitive Advantage)

Features that set the product apart. Valued but not expected.

| Feature                                                      | Value Proposition                                                          | Complexity | Notes                                                                                        |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| **SMTP configured via `.env` only**                          | Self-hosters control their own mail server; no third-party dependency      | LOW        | 5 env vars: HOST, PORT, USER, PASS, FROM; Nodemailer config                                  |
| **Email sending disabled gracefully if SMTP not configured** | Self-hosted app can run without email; no broken state                     | LOW        | Check for SMTP env vars; log warning, return graceful error to user                          |
| **Vault-branded dark HTML emails**                           | Email matches the app aesthetic; premium feel for a finance app            | MEDIUM     | Inline CSS only (email client compatibility); dark bg `#08080a`, amber `#f59e0b` header line |
| **Rate limiting on forgot-password endpoint**                | Prevents email flooding / enumeration attacks                              | LOW        | Use existing `rateLimit()` utility; 3-5 requests per 15 minutes per IP                       |
| **Token invalidation on password change**                    | If a password is reset, all existing reset tokens for that user are voided | LOW        | `DELETE FROM password_reset_tokens WHERE userId = ?` after successful reset                  |
| **Plaintext fallback in email**                              | Accessibility and spam score improvement                                   | LOW        | Nodemailer `text` field alongside `html` field                                               |

---

## Anti-Features (Deliberately NOT Build)

| Feature                                          | Why Requested                   | Why Problematic                                                                                           | Alternative                                                                     |
| ------------------------------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Email verification required for login**        | "Confirm users own their email" | Blocks self-hosted users if SMTP not configured; out of scope per PROJECT.md                              | Optional enhancement in v2; current flow allows immediate login                 |
| **Magic link login**                             | "No password to remember"       | Conflicts with existing credentials flow; adds UX complexity for self-hosted; requires session management | Password reset covers the "lost access" case; defer magic links to v2+          |
| **Third-party email service (SendGrid, Resend)** | "Better deliverability"         | Adds external dependency; self-hosters want control; overkill for personal finance app with 1-10 users    | SMTP via Nodemailer — works with Gmail, Mailgun, Postfix, etc.                  |
| **Email template engine (Handlebars, MJML)**     | "Reusable templates"            | Adds dependency and build complexity for what will be 2 email types                                       | Inline TypeScript functions returning HTML strings — sufficient for 2 templates |
| **Async email queue (Redis/Bull)**               | "Reliable delivery"             | Massive over-engineering for a self-hosted app with 1-10 users                                            | Fire-and-forget `sendMail()` in server action; log errors                       |
| **Account lockout after failed reset attempts**  | "Extra security"                | Token expiry + one-time use already covers this; lockout adds complexity and support burden               | Token expiry (1 hour) + rate limiting on request endpoint                       |
| **Reset token sent as URL hash fragment**        | "More secure"                   | Email clients often strip or don't render hash fragments; token needs to be query param                   | `?token=` query parameter is standard and universally supported                 |
| **Custom email editor UI in app**                | "Customize emails from UI"      | Major scope expansion; personal finance app doesn't need this                                             | Templates are code; update via deployment                                       |

---

## UX Flow: Password Reset

The complete user journey from "I forgot my password" to "I'm logged in again."

```
LOGIN PAGE
  └──[Forgot password?]──> FORGOT-PASSWORD PAGE
                               Form: email field + submit button
                               │
                               └──[Submit]──> forgotPasswordAction (Server Action)
                                               1. Rate limit check (IP-based)
                                               2. Validate email format (Zod)
                                               3. Look up user by email
                                               4. Always show success message (email enumeration prevention)
                                               5. If user found:
                                                  a. Generate: crypto.randomBytes(32).toString('hex')
                                                  b. Hash: sha256(token)
                                                  c. Insert into password_reset_tokens:
                                                     { userId, tokenHash, expiresAt: now + 1hr, usedAt: null }
                                                  d. Send email with link: APP_URL/reset-password?token=<rawToken>
                                               │
                               └──[Success state shown] "If this email exists, a reset link was sent."
                                   └──[User opens email] RESET EMAIL
                                       Contains: Link to /reset-password?token=<rawToken>
                                       Expires: 1 hour
                                       │
                                       └──[Click link]──> RESET-PASSWORD PAGE
                                                           1. Page reads token from URL query param
                                                           2. Server Component: validate token exists + not expired + not used
                                                              - If invalid: show "link expired or invalid" state
                                                              - If valid: show new-password form
                                                           3. Form: new password + confirm
                                                           │
                                                           └──[Submit]──> resetPasswordAction (Server Action)
                                                                           1. Re-validate token (race condition safety)
                                                                           2. Validate new password (Zod, same rules as register)
                                                                           3. Hash new password (bcrypt, SALT_ROUNDS=12)
                                                                           4. Update users.password
                                                                           5. Mark token used: SET usedAt = NOW()
                                                                           6. (Optional) Delete all other reset tokens for user
                                                                           7. Redirect to /login with success message
```

## UX Flow: Welcome Email

```
REGISTER PAGE
  └──[Submit]──> registerAction (Server Action) [existing]
                   1. SINGLE_USER_MODE gate
                   2. Validate input (Zod)
                   3. Check email uniqueness
                   4. Hash password
                   5. INSERT user  ←── NEW: after this succeeds
                   6. [NEW] sendWelcomeEmail(email) — fire and forget, non-blocking
                      - If SMTP not configured: log warning, continue
                      - If send fails: log error, continue (don't fail registration)
                   7. Auto-login
                   8. Redirect to /
```

---

## Feature Dependencies

```
SMTP Email Infrastructure
    └──enables──> Password Reset Email
    └──enables──> Welcome Email
    └──requires──> SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
    └──requires──> Nodemailer (npm install nodemailer)

Password Reset Flow
    └──requires──> SMTP Email Infrastructure
    └──requires──> passwordResetTokens DB table (NEW — separate from authVerificationTokens)
    └──requires──> Forgot-Password page + Server Action
    └──requires──> Reset-Password page + Server Action
    └──uses──> existing rateLimit() utility
    └──uses──> existing hashPassword() / bcrypt for new password hashing
    └──uses──> Node.js crypto (built-in) for token generation

Welcome Email
    └──requires──> SMTP Email Infrastructure
    └──requires──> modification to existing registerAction
    └──does NOT require──> new DB table (stateless email send)

HTML Email Templates
    └──requires──> Nodemailer (html field)
    └──uses──> Vault design tokens (hardcoded inline CSS — no Tailwind in emails)
    └──informs──> both Password Reset Email and Welcome Email
```

### Dependency Notes

- **`authVerificationTokens` table is NOT reused for password reset.** It is Auth.js adapter-owned with a composite PK on `(identifier, token)` and no `userId` FK or `usedAt` field. A separate `passwordResetTokens` table is required per PROJECT.md: `{ token, userId, expiresAt, usedAt }`.

- **Nodemailer is Node.js only.** It cannot run in Edge Runtime. The server actions and email-sending utility must use `'use server'` and run in Node.js runtime. This is already the case for all existing server actions.

- **`crypto.randomBytes` is Node.js built-in.** No additional library needed for token generation. Do not use `Math.random()` — not cryptographically secure.

- **Storing token hash in DB is recommended but adds complexity.** For a self-hosted personal finance app with a trusted DB, storing the raw token is pragmatic and acceptable. The PROJECT.md requirements do not specify hashing. However, hashing is the correct security posture if the DB is ever shared or backed up. Recommend hashing with `crypto.createHash('sha256').update(token).digest('hex')`.

- **Welcome email must not block registration.** If SMTP is not configured, registration should succeed silently. Wrap email send in try/catch; log the error; do not surface to user.

---

## MVP Definition

### Launch With (v1.1 — This Milestone)

- [ ] **SMTP configuration via `.env`** — 5 env vars; Nodemailer transport; `src/lib/email/mailer.ts`
- [ ] **Graceful SMTP-disabled state** — If env vars absent, log warning; `sendMail` returns `{ ok: false }` silently
- [ ] **`passwordResetTokens` DB table** — `id`, `userId`, `tokenHash`, `expiresAt`, `usedAt`, `createdAt`; Drizzle migration
- [ ] **`forgotPasswordAction` server action** — rate limited; always-success response; token generation + email send
- [ ] **`/forgot-password` page** — email field; success state; "Forgot password?" link added to login form
- [ ] **Password reset email HTML template** — Vault dark design; amber CTA button; token link
- [ ] **`resetPasswordAction` server action** — token validation; password update; token consumption
- [ ] **`/reset-password?token=` page** — server-validates token on load; shows form or error state
- [ ] **Welcome email HTML template** — Vault dark design; sent async in `registerAction`

### Add After Validation (v1.x)

- [ ] **Token hash storage** — Upgrade from raw token to sha256 hash in DB if security requirements increase
- [ ] **Email preview/test route** — Dev-only route to preview email templates in browser (`/api/email-preview`)
- [ ] **2FA (TOTP)** — After password reset is stable; separate milestone

### Future Consideration (v2+)

- [ ] **Magic link login** — Requires Auth.js Email provider; separate from credentials flow
- [ ] **Email verification on registration** — Requires `emailVerified` field usage (already in schema)
- [ ] **Audit log of auth events** — Password changes, reset requests logged

---

## Feature Prioritization Matrix

| Feature                          | User Value | Implementation Cost | Priority                  |
| -------------------------------- | ---------- | ------------------- | ------------------------- |
| SMTP infrastructure (mailer.ts)  | HIGH       | LOW                 | P1                        |
| Forgot-password page + action    | HIGH       | LOW                 | P1                        |
| Reset-password page + action     | HIGH       | MEDIUM              | P1                        |
| passwordResetTokens DB table     | HIGH       | LOW                 | P1                        |
| Password reset email template    | HIGH       | LOW                 | P1                        |
| "Forgot password?" link on login | HIGH       | LOW                 | P1                        |
| Welcome email                    | MEDIUM     | LOW                 | P1                        |
| Graceful SMTP-disabled state     | HIGH       | LOW                 | P1                        |
| Rate limiting on forgot-password | MEDIUM     | LOW                 | P1 (use existing utility) |
| Token hash in DB (sha256)        | MEDIUM     | LOW                 | P2                        |
| Email preview dev route          | LOW        | LOW                 | P3                        |
| Plaintext email fallback         | LOW        | LOW                 | P2                        |

**Priority key:**

- P1: Must have for v1.1 launch
- P2: Should have, add when easy
- P3: Nice to have, future consideration

---

## Security Considerations (Token Design)

These are non-negotiable for a correct password reset implementation.

### Token Generation

Use `crypto.randomBytes(32).toString('hex')` — produces a 64-character hex string with 256 bits of entropy. This is cryptographically secure and available in Node.js without any library.

Do NOT use:

- `Math.random()` — not cryptographically secure
- `uuid` — only 122 bits of randomness; acceptable but `crypto.randomBytes` is better
- Sequential IDs — trivially guessable

### Token Storage

**Minimum acceptable (v1.1):** Store raw token in DB. Acceptable for self-hosted single-user deployment where DB access implies full system compromise anyway.

**Recommended (upgrade path):** Store `sha256(token)` in DB; send raw token in email. If DB is leaked (backup, shared host), raw tokens remain protected.

### Token Expiry

1 hour is the industry standard. Set `expiresAt = new Date(Date.now() + 60 * 60 * 1000)`.

Check on BOTH page load (server component) AND form submission (server action) — race condition safety.

### One-Time Use

Set `usedAt = new Date()` when token is consumed. Always check `usedAt IS NULL` when validating.

After successful password reset, optionally delete all other reset tokens for the user (`DELETE WHERE userId = ? AND id != ?`) to prevent concurrent reset links from remaining valid.

### Email Enumeration Prevention

The `forgotPasswordAction` ALWAYS returns the same success message regardless of whether the email exists in the database. Never return "email not found" — it leaks user existence.

### Rate Limiting

Apply to the `forgotPasswordAction` endpoint specifically. 3-5 requests per 15 minutes per IP is standard. Use the existing `rateLimit()` utility already in the codebase.

---

## HTML Email Template Patterns

Email HTML is a notoriously hostile environment. Key constraints:

1. **No external CSS** — Gmail, Outlook, Apple Mail strip `<style>` blocks. All styles must be `style="..."` inline attributes.

2. **No Tailwind, no CSS variables** — These are runtime-resolved. Email clients get rendered HTML only.

3. **Table-based layout** — Wide email client support; `<table>` is safer than `<div>` + flexbox for Outlook.

4. **Dark mode email** — Problematic. Many clients ignore `prefers-color-scheme` or override dark background colors. For Vault design: set `background-color` explicitly on every element, not just the body. Accept that some clients will show light mode.

5. **Max width: 600px** — Standard email width constraint.

6. **Inline fallback font stack** — Web fonts not available in email. Use `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.

### Vault Email Template Structure

```html
<!-- Outer wrapper: forces dark bg in most clients -->
<body style="background-color: #08080a; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <!-- Card -->
        <table
          width="600"
          cellpadding="0"
          cellspacing="0"
          style="background-color: #111113; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);"
        >
          <!-- Amber accent line at top -->
          <tr>
            <td
              style="height: 3px; background: linear-gradient(90deg, transparent, #f59e0b, transparent);"
            ></td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 32px;">
              <!-- Logo text or image -->
              <!-- Heading: Syne-fallback → system font -->
              <!-- Body copy -->
              <!-- CTA Button: amber bg #f59e0b, black text, rounded -->
              <!-- Footer: muted text, app URL -->
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
```

Two templates needed:

1. **`password-reset.ts`** — Subject: "Reset your Cashlytics password"; CTA: "Reset Password" → reset link; expires notice
2. **`welcome.ts`** — Subject: "Welcome to Cashlytics"; CTA: "Go to Dashboard" → app URL; brief feature mention

Both templates are TypeScript functions: `(params) => { subject: string; html: string; text: string }`.

---

## Sources

| Source                                               | What Informed                                                                 | Confidence |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- |
| `src/actions/auth-actions.ts` (codebase)             | Existing server action pattern, AuthActionState type, bcrypt usage            | HIGH       |
| `src/lib/rate-limiter.ts` (codebase)                 | Existing rate limiting utility for reuse                                      | HIGH       |
| `src/lib/db/schema.ts` (codebase)                    | `authVerificationTokens` table structure, users table columns                 | HIGH       |
| `src/components/organisms/login-form.tsx` (codebase) | UI pattern for auth forms, glass card pattern                                 | HIGH       |
| `src/app/(auth)/layout.tsx` (codebase)               | Auth layout two-panel design, Vault design tokens                             | HIGH       |
| `package.json` (codebase)                            | Nodemailer not installed; `crypto` is Node.js built-in                        | HIGH       |
| `.planning/PROJECT.md`                               | Explicit v1.1 requirements, out-of-scope features                             | HIGH       |
| Industry standard security patterns                  | Token entropy (32 bytes), 1-hour expiry, one-time use, enumeration prevention | HIGH       |
| Email HTML rendering constraints                     | Inline CSS requirement, table layout, 600px width, dark mode limitations      | HIGH       |

---

_Feature research for: Email Sending + Password Reset Flow (v1.1)_
_Researched: 2026-02-25_
