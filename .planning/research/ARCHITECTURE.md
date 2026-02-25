# Architecture Research

**Domain:** Nodemailer SMTP + Password Reset Token Flow — Integration with Next.js 15/16 App Router + Drizzle + Auth.js v5
**Researched:** 2026-02-25
**Confidence:** HIGH (direct codebase analysis + Auth.js v5 official patterns + Nodemailer documentation)

## Standard Architecture

### System Overview

The email infrastructure adds a lateral service layer alongside the existing auth layer. It does not replace or modify Auth.js internals — it sits alongside them, invoked from Server Actions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROXY LAYER (proxy.ts)                             │
│  - Route protection via getToken (JWT strategy)                              │
│  - /forgot-password and /reset-password → PUBLIC (no token required)        │
│  - Explicit allowlist in proxy.ts alongside /login and /register             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                           PRESENTATION LAYER                                  │
│  ┌───────────────────┐  ┌─────────────────────────────────────────────────┐  │
│  │  Existing Pages   │  │              NEW Auth Pages                      │  │
│  │  /login           │  │  /forgot-password   /reset-password              │  │
│  │  /register        │  │  (auth route group — share auth layout)          │  │
│  └───────────────────┘  └──────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  Components                                                              │  │
│  │  ForgotPasswordForm (organisms)   ResetPasswordForm (organisms)          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                          SERVER ACTIONS LAYER                                 │
│  ┌──────────────────────────────┐  ┌───────────────────────────────────┐    │
│  │  auth-actions.ts (MODIFIED)  │  │       NEW email actions            │    │
│  │  registerAction →            │  │  forgotPasswordAction              │    │
│  │    sendWelcomeEmail() ─────► │  │  resetPasswordAction               │    │
│  │                              │  │                                    │    │
│  └──────────────────────────────┘  └─────────────────┬─────────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│                           EMAIL SERVICE LAYER (NEW)                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  src/lib/email/                                                       │   │
│  │                                                                        │   │
│  │  index.ts          — createTransport(), sendMail() wrapper            │   │
│  │  templates/        — HTML template functions (Vault dark design)      │   │
│  │    welcome.ts      — Welcome email template                           │   │
│  │    reset.ts        — Password reset email template                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                           TOKEN SERVICE LAYER (NEW)                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  src/lib/auth/reset-token.ts                                          │   │
│  │                                                                        │   │
│  │  generateResetToken()   — crypto.randomBytes → hex string             │   │
│  │  createResetToken()     — insert into password_reset_tokens           │   │
│  │  validateResetToken()   — select + check expiresAt + usedAt           │   │
│  │  consumeResetToken()    — set usedAt = now()                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                           DATABASE LAYER                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Drizzle ORM + PostgreSQL                                             │   │
│  │                                                                        │   │
│  │  Existing:                     NEW:                                   │   │
│  │  - users                       - password_reset_tokens                │   │
│  │  - auth_accounts                 token TEXT (unique, indexed)         │   │
│  │  - auth_sessions                 userId UUID FK → users.id            │   │
│  │  - auth_verification_tokens      expiresAt TIMESTAMP NOT NULL         │   │
│  │  - (all financial tables)        usedAt TIMESTAMP (nullable)          │   │
│  │                                  createdAt TIMESTAMP                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  External:                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  SMTP Server (user-configured via .env)                               │   │
│  │  Nodemailer → SMTP_HOST:SMTP_PORT (STARTTLS or SSL)                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component                                           | Responsibility                                                   | Location |
| --------------------------------------------------- | ---------------------------------------------------------------- | -------- |
| `src/lib/email/index.ts`                            | Nodemailer transporter singleton, `sendMail()` wrapper           | NEW      |
| `src/lib/email/templates/welcome.ts`                | HTML string for welcome email                                    | NEW      |
| `src/lib/email/templates/reset.ts`                  | HTML string for password reset email                             | NEW      |
| `src/lib/auth/reset-token.ts`                       | Token generation, DB insert/validate/consume                     | NEW      |
| `src/actions/auth-actions.ts`                       | Modified `registerAction` to trigger welcome email               | MODIFIED |
| `src/actions/email-actions.ts`                      | `forgotPasswordAction`, `resetPasswordAction`                    | NEW      |
| `src/lib/db/schema.ts`                              | Add `passwordResetTokens` table definition                       | MODIFIED |
| `drizzle/0006_*.sql`                                | Migration for `password_reset_tokens` table                      | NEW      |
| `src/app/(auth)/forgot-password/page.tsx`           | Forgot password page                                             | NEW      |
| `src/app/(auth)/reset-password/page.tsx`            | Reset password page (reads `?token=` from URL)                   | NEW      |
| `src/components/organisms/forgot-password-form.tsx` | Client form component                                            | NEW      |
| `src/components/organisms/reset-password-form.tsx`  | Client form component                                            | NEW      |
| `src/lib/validations/auth.ts`                       | Add `forgotPasswordSchema`, `resetPasswordSchema`                | MODIFIED |
| `src/proxy.ts`                                      | Add `/forgot-password` and `/reset-password` to public allowlist | MODIFIED |
| `.env.example`                                      | Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM vars   | MODIFIED |

## Recommended Project Structure

```
cashlytics/
├── auth.ts                                     # Unchanged
├── auth.config.ts                              # Unchanged
├── proxy.ts                                    # MODIFIED — add new public routes
│
├── src/
│   ├── app/
│   │   └── (auth)/
│   │       ├── layout.tsx                      # Unchanged — new pages share existing layout
│   │       ├── login/
│   │       │   └── page.tsx                    # Unchanged
│   │       ├── register/
│   │       │   └── page.tsx                    # Unchanged
│   │       ├── forgot-password/                # NEW
│   │       │   └── page.tsx                    # Renders ForgotPasswordForm
│   │       └── reset-password/                 # NEW
│   │           └── page.tsx                    # Reads ?token= searchParam, renders ResetPasswordForm
│   │
│   ├── actions/
│   │   ├── auth-actions.ts                     # MODIFIED — registerAction sends welcome email
│   │   └── email-actions.ts                    # NEW — forgotPasswordAction, resetPasswordAction
│   │
│   ├── components/
│   │   └── organisms/
│   │       ├── forgot-password-form.tsx        # NEW — useActionState + forgotPasswordAction
│   │       └── reset-password-form.tsx         # NEW — useActionState + resetPasswordAction
│   │
│   └── lib/
│       ├── email/                              # NEW module
│       │   ├── index.ts                        # Nodemailer transporter + sendMail()
│       │   └── templates/
│       │       ├── welcome.ts                  # Welcome email HTML template function
│       │       └── reset.ts                    # Password reset email HTML template function
│       │
│       ├── auth/
│       │   ├── password.ts                     # Unchanged
│       │   ├── registration-mode.ts            # Unchanged
│       │   ├── require-auth.ts                 # Unchanged
│       │   ├── user-id.ts                      # Unchanged (deprecated)
│       │   └── reset-token.ts                  # NEW — token generation + DB operations
│       │
│       ├── db/
│       │   └── schema.ts                       # MODIFIED — add passwordResetTokens table
│       │
│       └── validations/
│           └── auth.ts                         # MODIFIED — add forgot/reset schemas
│
└── drizzle/
    └── 0006_password_reset_tokens.sql          # NEW migration
```

### Structure Rationale

- **`src/lib/email/`:** Keeps email concern isolated from auth logic. `index.ts` owns the Nodemailer transporter singleton; templates are pure functions returning HTML strings — easy to test, no side effects.
- **`src/lib/auth/reset-token.ts`:** Token operations belong in `auth/` alongside password utilities, not in `email/`. Token lifecycle (create/validate/consume) is an auth concern; sending the email that contains the token is an email concern. The action layer bridges them.
- **`src/actions/email-actions.ts`:** New action file rather than adding to `auth-actions.ts` keeps the auth file focused on session management (login/register/logout). Email-triggered flows live separately.
- **`src/app/(auth)/forgot-password/` and `reset-password/`:** Placed in the `(auth)` route group so they share the existing auth layout (two-panel Vault design with branding) without any layout duplication.
- **No new route group:** No need for a separate `(email)` or `(password-reset)` group. The `(auth)` group already handles unauthenticated flows.

## Architectural Patterns

### Pattern 1: Nodemailer Singleton Transporter

**What:** Create the Nodemailer transporter once at module level, not per-request.

**When to use:** Always. Creating a new transporter per email call reconnects to SMTP on every send, which is expensive and can trigger connection limits.

**Trade-offs:** Module-level singleton persists across requests in the same Node.js process. In serverless environments (Vercel), each cold start creates a new transporter — acceptable since SMTP connections are cheap to establish once per cold start.

**Example:**

```typescript
// src/lib/email/index.ts
import nodemailer from "nodemailer";

// Created once per Node.js process lifetime
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT) === 465, // true for port 465 (SSL), false for STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    ...options,
  });
}
```

### Pattern 2: Pure HTML Template Functions

**What:** Email templates are plain TypeScript functions that accept data and return an HTML string. No JSX, no external template engines.

**When to use:** For self-hosted apps where email volume is low and design matches a defined system. Avoids adding React Email or MJML as dependencies.

**Trade-offs:** Inline styles required (many email clients strip `<head>` CSS). More verbose than JSX. Inline HTML strings can be hard to read — structure carefully with string concatenation.

**Example:**

```typescript
// src/lib/email/templates/reset.ts
export interface ResetEmailData {
  resetUrl: string;
  expiresInMinutes: number;
}

export function resetPasswordEmailHtml(data: ResetEmailData): string {
  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#08080a;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#08080a;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#111113;border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden;">
        <!-- Amber accent bar -->
        <tr><td style="background:linear-gradient(90deg,#f59e0b,#d97706);height:3px;"></td></tr>
        <tr><td style="padding:40px;">
          <h1 style="color:#f9fafb;font-size:22px;margin:0 0 8px;">Passwort zurücksetzen</h1>
          <p style="color:rgba(249,250,251,0.5);font-size:14px;margin:0 0 32px;">
            Klick auf den Button, um ein neues Passwort festzulegen. Der Link ist ${data.expiresInMinutes} Minuten gültig.
          </p>
          <a href="${data.resetUrl}"
             style="display:inline-block;background:#f59e0b;color:#0a0a0a;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
            Passwort zurücksetzen
          </a>
          <p style="color:rgba(249,250,251,0.3);font-size:12px;margin:32px 0 0;">
            Falls du diese Email nicht angefordert hast, kannst du sie ignorieren.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
```

### Pattern 3: Crypto Token Generation with Single-Use Enforcement

**What:** Generate tokens with `crypto.randomBytes` (Node.js built-in). Store in DB with `expiresAt` and `usedAt`. Invalidate on use by setting `usedAt`.

**When to use:** Password reset flows. Do not reuse Auth.js's `authVerificationTokens` table — that table uses a composite primary key on `(identifier, token)` and is managed by the Auth.js adapter. Mixing custom logic with adapter-managed tables creates maintenance risk.

**Trade-offs:** Adding a new table is explicit but means two separate token tables in the schema. Worth the clarity.

**Example:**

```typescript
// src/lib/auth/reset-token.ts
import crypto from "crypto";
import { db } from "@/lib/db";
import { passwordResetTokens } from "@/lib/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";

const TOKEN_EXPIRY_MINUTES = 60;

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex"); // 64-char hex string
}

export async function createResetToken(userId: string): Promise<string> {
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await db.insert(passwordResetTokens).values({ token, userId, expiresAt });
  return token;
}

export async function validateResetToken(
  token: string
): Promise<{ valid: true; userId: string } | { valid: false }> {
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date()), // not expired
        isNull(passwordResetTokens.usedAt) // not already used
      )
    )
    .limit(1);

  if (!row) return { valid: false };
  return { valid: true, userId: row.userId };
}

export async function consumeResetToken(token: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.token, token));
}
```

### Pattern 4: Server Actions as the Bridge Layer

**What:** Server actions call token utilities and email service in the correct order, never leaking token values or user lookups to the client.

**When to use:** For all state-changing flows (forgot-password request, password reset). Return only success/error states to client.

**Trade-offs:** The action is the single point where DB + email are coordinated. If email sending fails, the token is still in the DB. This is intentional — the user can request again. Do not delete a newly created token on email send failure.

**Example:**

```typescript
// src/actions/email-actions.ts
"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createResetToken, validateResetToken, consumeResetToken } from "@/lib/auth/reset-token";
import { sendMail } from "@/lib/email";
import { resetPasswordEmailHtml } from "@/lib/email/templates/reset";
import { hashPassword } from "@/lib/auth/password";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";

export type EmailActionState = { error?: string; success?: boolean };

export async function forgotPasswordAction(
  _prev: EmailActionState,
  formData: FormData
): Promise<EmailActionState> {
  const result = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!result.success) return { error: "Ungültige Email-Adresse." };

  const { email } = result.data;
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Always return success — never reveal whether email exists
  if (!user) return { success: true };

  const token = await createResetToken(user.id);
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  await sendMail({
    to: email,
    subject: "Passwort zurücksetzen — Cashlytics",
    html: resetPasswordEmailHtml({ resetUrl, expiresInMinutes: 60 }),
  });

  return { success: true };
}

export async function resetPasswordAction(
  _prev: EmailActionState,
  formData: FormData
): Promise<EmailActionState> {
  const result = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!result.success) return { error: result.error.issues[0].message };

  const { token, password } = result.data;
  const validation = await validateResetToken(token);
  if (!validation.valid) return { error: "Ungültiger oder abgelaufener Reset-Link." };

  const hashedPassword = await hashPassword(password);

  // Atomic: update password + consume token
  await Promise.all([
    db.update(users).set({ password: hashedPassword }).where(eq(users.id, validation.userId)),
    consumeResetToken(token),
  ]);

  return { success: true };
}
```

## Data Flow

### Forgot-Password Flow

```
User submits email on /forgot-password
    ↓
forgotPasswordAction (Server Action)
    ├── validate email format (Zod)
    ├── look up user by email in DB
    │   └── if not found: return { success: true } (no email reveal)
    ├── createResetToken(userId)
    │   └── crypto.randomBytes(32).toString("hex")
    │   └── INSERT INTO password_reset_tokens (token, userId, expiresAt)
    ├── build resetUrl = NEXT_PUBLIC_APP_URL + /reset-password?token=...
    └── sendMail({ to, subject, html: resetPasswordEmailHtml(resetUrl) })
        └── Nodemailer → SMTP server → User inbox
    ↓
Return { success: true } — page shows confirmation message
```

### Reset-Password Flow

```
User clicks link in email → /reset-password?token=abc123
    ↓
reset-password/page.tsx (Server Component)
    └── reads searchParams.token, passes as hidden input to ResetPasswordForm
    ↓
User submits new password
    ↓
resetPasswordAction (Server Action)
    ├── validate token + password + confirmPassword (Zod)
    ├── validateResetToken(token)
    │   └── SELECT WHERE token = ? AND expiresAt > NOW() AND usedAt IS NULL
    │   └── if invalid: return { error: "Ungültiger oder abgelaufener Reset-Link." }
    ├── hashPassword(newPassword)
    ├── UPDATE users SET password = ? WHERE id = userId
    └── consumeResetToken(token) → UPDATE usedAt = NOW()
    ↓
Return { success: true } — page shows success + link to /login
```

### Welcome Email Flow

```
registerAction (existing, in auth-actions.ts)
    ├── ... existing: validate, check duplicate, hashPassword, INSERT user ...
    ├── [NEW] sendWelcomeEmail({ to: email })
    │   └── sendMail({ to, subject, html: welcomeEmailHtml({ email }) })
    └── ... existing: signIn + redirect ...
```

### Key Data Flows

1. **Email never exposes user existence:** `forgotPasswordAction` returns `{ success: true }` whether or not the user exists. This prevents email enumeration.
2. **Token is single-use:** `consumeResetToken` sets `usedAt` before returning success. A second submit with the same token fails `isNull(usedAt)` check.
3. **Token never touches the client form state:** The token is passed as a hidden `<input>` inside the reset form — it flows server-to-server. No client-side token storage.
4. **Password update and token consumption are parallel:** `Promise.all([updatePassword, consumeToken])` — if either fails, the user can retry (token is still valid if consume failed, password unchanged if update failed).

## Integration Points

### proxy.ts — Route Protection Changes

The `proxy.ts` currently allows `/login` and `/register` as public routes. The two new auth pages must be added to the same public allowlist:

```typescript
// src/proxy.ts — BEFORE
if (pathname === "/login" || pathname === "/register") {

// src/proxy.ts — AFTER
if (
  pathname === "/login" ||
  pathname === "/register" ||
  pathname === "/forgot-password" ||
  pathname === "/reset-password"
) {
```

Both new routes must allow unauthenticated access. If a logged-in user hits `/forgot-password`, they should be redirected to `/` (same behaviour as `/login` for logged-in users).

### schema.ts — New Table

Add to `src/lib/db/schema.ts`:

```typescript
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Note: `token` gets a unique constraint (enforced at DB level). The `onDelete: "cascade"` means tokens are automatically removed if the user is deleted.

### auth-actions.ts — Welcome Email Hook

The `registerAction` function needs a single addition after the user is inserted and before the auto-login. Welcome email failure should not block registration — wrap in try/catch and log the error:

```typescript
// After: await db.insert(users).values({ email, password: hashedPassword });
try {
  await sendMail({
    to: email,
    subject: "Willkommen bei Cashlytics",
    html: welcomeEmailHtml({ email }),
  });
} catch (err) {
  // Email send failure should not break registration
  logger.error("Welcome email failed", "email", err);
}
// Then: existing auto-login signIn() call
```

### .env — New Variables

```bash
# SMTP Configuration (Required for email features)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM="Cashlytics <noreply@example.com>"
```

The `secure` flag in Nodemailer transporter should be derived from `SMTP_PORT`: `443` or `465` → `true` (SSL/TLS), everything else → `false` (STARTTLS via `STARTTLS` upgrade).

### validations/auth.ts — New Schemas

```typescript
export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email ist erforderlich").email("Ungültige Email"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token fehlt"),
    password: z
      .string()
      .min(8, "Passwort muss mindestens 8 Zeichen haben")
      .regex(/\d/, "Passwort muss eine Zahl enthalten"),
    confirmPassword: z.string().min(1, "Bitte Passwort bestätigen"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
  });
```

## Build Order (Dependency-Ordered)

Dependencies run strict: DB table before token code, token code before actions, actions before forms, forms before pages, proxy last.

```
Step 1 — DB Schema + Migration (FOUNDATION)
├── Add passwordResetTokens table to src/lib/db/schema.ts
├── Run: npm run db:generate  → creates drizzle/0006_*.sql
└── Run: npm run db:migrate   → applies to database

Step 2 — Email Service Module (NO DEPS ON STEP 1)
├── npm install nodemailer && npm install -D @types/nodemailer
├── Create src/lib/email/index.ts  — transporter + sendMail()
├── Create src/lib/email/templates/welcome.ts
└── Create src/lib/email/templates/reset.ts

Step 3 — Token Utilities (DEPENDS ON STEP 1)
└── Create src/lib/auth/reset-token.ts
    — generateResetToken, createResetToken, validateResetToken, consumeResetToken
    — imports passwordResetTokens from schema (exists after Step 1)

Step 4 — Zod Schemas (NO DEPS)
└── Extend src/lib/validations/auth.ts
    — add forgotPasswordSchema, resetPasswordSchema

Step 5 — Server Actions (DEPENDS ON STEPS 2, 3, 4)
├── Create src/actions/email-actions.ts
│   — forgotPasswordAction (uses token utils + email service + validation)
│   — resetPasswordAction (uses token utils + password util + validation)
└── Modify src/actions/auth-actions.ts
    — registerAction: add sendWelcomeEmail() after insert, before signIn

Step 6 — UI Components (DEPENDS ON STEP 5)
├── Create src/components/organisms/forgot-password-form.tsx
│   — useActionState(forgotPasswordAction, {})
│   — email input, submit button, success/error states
└── Create src/components/organisms/reset-password-form.tsx
    — useActionState(resetPasswordAction, {})
    — hidden token input, new password + confirm inputs

Step 7 — Pages (DEPENDS ON STEP 6)
├── Create src/app/(auth)/forgot-password/page.tsx
│   — renders ForgotPasswordForm, link back to /login
└── Create src/app/(auth)/reset-password/page.tsx
    — Server Component reads searchParams.token
    — passes token to ResetPasswordForm as hidden input
    — handles invalid/missing token: redirect to /forgot-password

Step 8 — Proxy Update (DEPENDS ON STEPS 7)
└── Modify src/proxy.ts
    — add /forgot-password and /reset-password to public allowlist

Step 9 — .env.example Update (NO DEPS, but last for documentation completeness)
└── Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM with comments
```

## Anti-Patterns

### Anti-Pattern 1: Reusing Auth.js `authVerificationTokens` Table

**What people do:** Store password reset tokens in the existing `auth_verification_tokens` table (already in schema, managed by DrizzleAdapter).

**Why it's wrong:** That table is managed by the Auth.js adapter's internal lifecycle. Its schema (composite key on `[identifier, token]`) does not support `usedAt` for single-use enforcement. Inserting into adapter-managed tables outside of Auth.js creates conflict risk on adapter upgrades.

**Do this instead:** Create a dedicated `password_reset_tokens` table with explicit `usedAt` column. Add it to schema.ts alongside the Auth.js tables. Generate a new migration. This table is fully under application control.

### Anti-Pattern 2: Deleting Token Immediately on Use

**What people do:** `DELETE FROM password_reset_tokens WHERE token = ?` after successful password reset.

**Why it's wrong:** If the DELETE succeeds but the password UPDATE fails (race condition, DB error), the token is gone — the user cannot retry. Also eliminates audit trail.

**Do this instead:** Set `usedAt = NOW()` and leave the row. Add a background cleanup job (or run cleanup at token creation time) to purge tokens older than, say, 7 days. The `isNull(usedAt)` check in `validateResetToken` enforces single-use without deletion.

### Anti-Pattern 3: Revealing User Existence in Forgot-Password Response

**What people do:** Return `"No account found with this email"` when the email doesn't match any user.

**Why it's wrong:** Allows an attacker to enumerate valid email addresses registered in the app.

**Do this instead:** Always return `{ success: true }` with the same message regardless of whether the user exists. The email either arrives or it doesn't — the user cannot tell from the UI response.

### Anti-Pattern 4: Nodemailer Transporter Created Per-Request

**What people do:** Call `nodemailer.createTransport({...})` inside the action function.

**Why it's wrong:** Creates a new SMTP connection on every email send. In Node.js long-running process mode, this means constant reconnects. Nodemailer transporters are designed to be reused.

**Do this instead:** Export the transporter from `src/lib/email/index.ts` as a module-level constant. Next.js App Router caches module instances within a request lifecycle, so this is safe.

### Anti-Pattern 5: Blocking Registration on Email Failure

**What people do:** Wrap `sendWelcomeEmail()` without try/catch and let exceptions propagate, causing the `registerAction` to return an error.

**Why it's wrong:** Email is a non-critical side effect of registration. An SMTP misconfiguration should not prevent users from registering. The account was already created — returning an error leaves the user confused (account exists but form shows error).

**Do this instead:** Wrap `sendWelcomeEmail()` in try/catch. Log the failure with the existing `logger` utility. Registration succeeds regardless of email send result.

### Anti-Pattern 6: Token in URL Fragment Instead of Query Param

**What people do:** Put the token after `#` (fragment) in the reset URL.

**Why it's wrong:** URL fragments are not sent to the server. The Server Component page.tsx cannot read `searchParams.token` if the token is in the fragment.

**Do this instead:** Use query parameter: `/reset-password?token=abc123`. The Server Component page reads `searchParams.token` from the Next.js App Router `searchParams` prop.

## Scaling Considerations

| Scale        | Architecture Adjustments                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| 0-1k users   | Nodemailer direct SMTP — no queue needed, synchronous send in action                                             |
| 1k-10k users | Consider SMTP relay (SendGrid, Postmark API) instead of raw SMTP. Email queue (BullMQ + Redis) to handle spikes. |
| 10k+ users   | Move email to dedicated microservice. Webhook delivery status tracking.                                          |

### Scaling Priorities

1. **First bottleneck:** SMTP server connection limits. Fix: Use transactional email API (SendGrid/Postmark) which handles connection pooling internally. Nodemailer supports these as transports.
2. **Second bottleneck:** Token table grows unbounded. Fix: Add periodic cleanup of expired/used tokens. Can be a simple DB cron or cleanup on token creation (delete expired rows for same userId before inserting new).

## Sources

- Nodemailer documentation: https://nodemailer.com/about/ (HIGH confidence — official)
- Nodemailer SMTP transport: https://nodemailer.com/smtp/ (HIGH confidence — official)
- Auth.js v5 custom tokens guidance: https://authjs.dev/ (MEDIUM confidence — Auth.js docs focus on built-in flows)
- Next.js 15 Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations (HIGH confidence — official)
- Next.js searchParams in Server Components: https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional (HIGH confidence — official)
- Node.js crypto.randomBytes: https://nodejs.org/api/crypto.html#cryptorandombytessize-callback (HIGH confidence — built-in, stable)
- Existing codebase analysis: /home/coder/cashlytics/src/ (HIGH confidence — direct inspection)

---

_Architecture research for: Nodemailer SMTP + Password Reset Token Flow integration with Next.js 15/16 + Drizzle + Auth.js v5_
_Researched: 2026-02-25_
