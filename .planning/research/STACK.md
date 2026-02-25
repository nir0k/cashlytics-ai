# Stack Research: Email/SMTP Integration

**Domain:** Email capabilities for Next.js app (SMTP, templates, password reset)
**Researched:** 2026-02-25
**Confidence:** HIGH (versions verified via npm registry 2026-02-25)

---

## Context: What Already Exists

This is a **subsequent milestone** on an existing v1.0 codebase. Do NOT re-research the existing stack.

**Already in place (do not change):**

| Thing             | Detail                                                           |
| ----------------- | ---------------------------------------------------------------- |
| Auth.js v5        | `next-auth@5.0.0-beta.30`, JWT sessions, Drizzle adapter         |
| Password hashing  | `bcrypt@6.0.0` (pure JS), `@types/bcrypt@6.0.0`                  |
| DB schema         | `authVerificationTokens` table already exists (Auth.js standard) |
| Server Actions    | Run in Node.js runtime (not Edge) — Nodemailer is safe here      |
| Docker deployment | No native build tools in image — pure-JS packages preferred      |
| date-fns          | Already installed (`^4.1.0`) — use for token expiry              |

---

## Recommended Stack (New Additions Only)

### Core Technologies

| Technology                | Version  | Purpose                   | Why Recommended                                                                                                                                                               |
| ------------------------- | -------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodemailer`              | `^8.0.1` | SMTP email sending        | Zero dependencies (verified), pure JS, Docker-friendly. Industry standard for Node.js SMTP. Self-hosted friendly (no SaaS lock-in).                                           |
| `@react-email/components` | `^1.0.8` | Email template components | React-based email templates matching Next.js stack. Includes `@react-email/render@2.0.4` and `@react-email/tailwind@2.0.5`. Supports React 19 (peer dep: `^18.0 \|\| ^19.0`). |
| Node.js `crypto`          | built-in | Secure token generation   | No package needed. `crypto.randomBytes(32).toString('hex')` for reset tokens. Same approach Auth.js uses internally.                                                          |

### Supporting Libraries

| Library       | Version  | Purpose                   | When to Use                                                                                           |
| ------------- | -------- | ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `react-email` | `^5.2.8` | Email preview/dev tooling | Optional — for local email template development with hot-reload preview. Not required for production. |

> **Important:** `nodemailer@8.x` includes TypeScript types — `@types/nodemailer` is NOT needed.

---

## Installation

```bash
# Required
npm install nodemailer @react-email/components

# Optional — for local email development with preview
npm install -D react-email
```

---

## Token Storage: Two Approaches

### Option A: Dedicated Table (Recommended)

Add a new `passwordResetTokens` table via Drizzle migration:

```typescript
// src/lib/db/schema.ts
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(), // crypto.randomBytes(32).toString('hex')
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  usedAt: timestamp("used_at", { mode: "date" }), // null = not yet used
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Why dedicated table:**

- `usedAt` column for one-time-use tracking — Auth.js table lacks this
- `userId` FK for direct user relationship — simpler queries
- Independent of Auth.js adapter internals — won't conflict if Auth.js adds password reset later
- Cleaner separation of concerns

### Option B: Reuse `authVerificationTokens` (Simpler)

The existing table can work for password reset:

```typescript
// Existing schema (lines 76-84)
export const authVerificationTokens = pgTable(
  "auth_verification_tokens",
  {
    identifier: text("identifier").notNull(), // user email for reset
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);
```

**Trade-offs:**

- ✅ No migration needed — table already exists
- ✅ Auth.js adapter already manages cleanup
- ❌ No `usedAt` — can't enforce one-time use at DB level
- ❌ No `userId` FK — must join on `identifier = email`
- ❌ Auth.js may add conflicting usage in future

**Recommendation:** Use Option A (dedicated table) for cleaner architecture and future-proofing. The migration is simple.

---

## Integration Points with Existing Auth.js v5 Setup

### Password Reset Flow (Custom — Not Auth.js Built-in)

Auth.js v5 does NOT have built-in password reset for Credentials provider. Build custom:

```
1. User submits email on /forgot-password
2. Server Action: look up user by email, generate token, store in passwordResetTokens, send email
3. User clicks link: /reset-password?token=<hex>
4. Server Action: validate token (exists, not expired, not used), hash new password, update users.password, mark token usedAt
5. Redirect to /login
```

Auth.js is not involved in steps 1-4. The reset flow uses `db` directly + `bcrypt` (already installed).

### Welcome Email Hook

Add to `registerAction()` after successful registration (line 85 in `auth-actions.ts`):

```typescript
// After successful user insertion
await sendWelcomeEmail(email); // Fire-and-forget, don't block registration
```

**Do NOT** use Auth.js `events.createUser` callback — it fires for ALL user creation including OAuth (not applicable here) and can fail silently.

### Runtime Safety

Nodemailer only works in Node.js runtime. It will fail at Edge runtime. This is safe because:

- All Server Actions run in Node.js runtime by default in Next.js
- `src/proxy.ts` (the Edge middleware) does NOT need to send email — it only reads JWT sessions

**Do not** call Nodemailer from Route Handlers with `export const runtime = 'edge'`.

---

## Environment Variables

Add to `.env`:

```bash
# SMTP Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM="Cashlytics <noreply@yourdomain.com>"
# Optional: secure=true for port 465, false for 587 with STARTTLS
SMTP_SECURE=false
```

---

## Email Architecture

### File Structure

```
src/lib/email/
├── index.ts              # Main send function
├── transport.ts          # Nodemailer transport factory
├── config.ts             # SMTP env vars with validation
src/emails/
├── password-reset.tsx    # React Email template
└── welcome.tsx           # React Email template
```

### Transport Factory

```typescript
// src/lib/email/transport.ts
import nodemailer from "nodemailer";

export function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}
```

Create transport per invocation (not singleton) — Server Actions are stateless.

### Send Utility

```typescript
// src/lib/email/index.ts
import { render } from "@react-email/components";
import { createTransport } from "./transport";

export async function sendEmail({
  to,
  subject,
  template,
}: {
  to: string;
  subject: string;
  template: React.ReactElement;
}) {
  // Guard: skip if SMTP not configured (dev without email)
  if (!process.env.SMTP_HOST) {
    console.warn("[email] SMTP not configured, skipping send");
    return;
  }

  const html = await render(template);
  const text = await render(template, { plainText: true });
  const transport = createTransport();

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
    text, // Plain text fallback for email clients
  });
}
```

### Template Example

```tsx
// src/emails/password-reset.tsx
import { Html, Head, Body, Container, Text, Button, Link } from "@react-email/components";

interface PasswordResetEmailProps {
  resetUrl: string;
  userName?: string;
}

export function PasswordResetEmail({ resetUrl, userName }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#1a1a1a", color: "#f5f5f5" }}>
        <Container style={{ padding: "40px 20px", textAlign: "center" }}>
          <Text style={{ fontSize: "24px", fontWeight: "bold", color: "#f59e0b" }}>Cashlytics</Text>
          <Text>Hello {userName || "there"},</Text>
          <Text>Click the button below to reset your password:</Text>
          <Button
            href={resetUrl}
            style={{
              backgroundColor: "#f59e0b",
              color: "#1a1a1a",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            Reset Password
          </Button>
          <Text style={{ fontSize: "12px", color: "#888" }}>This link expires in 1 hour.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

---

## Alternatives Considered

| Recommended               | Alternative        | When to Use Alternative                                                                                           |
| ------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `nodemailer`              | `resend` SDK       | If using Resend as provider; has nice API SDK but locks you to their SaaS. Project requires generic SMTP.         |
| `nodemailer`              | `@sendgrid/mail`   | SendGrid-specific; vendor lock-in. Not appropriate for self-hosted.                                               |
| `@react-email/components` | Plain HTML strings | Only for 1-2 simple emails. React Email gives better DX, type safety, email-client CSS compat.                    |
| `@react-email/components` | `mjml`             | MJML is another DSL, requires compile step, less TypeScript integration. React Email is the modern choice.        |
| `crypto.randomBytes`      | `nanoid` / `uuid`  | Fine if already installed, but they're not. `crypto.randomBytes(32).toString('hex')` = 256-bit token, no package. |

---

## What NOT to Use

| Avoid                             | Why                                                           | Use Instead             |
| --------------------------------- | ------------------------------------------------------------- | ----------------------- |
| `@types/nodemailer`               | nodemailer@8.x includes TypeScript types                      | Just use `nodemailer`   |
| `sendmail` (native)               | Requires system sendmail, not Docker-friendly                 | nodemailer with SMTP    |
| `email-templates` (npm)           | Legacy, heavy deps, older patterns                            | @react-email/components |
| Ethereal Email in prod            | Test-only service, emails are public                          | Real SMTP provider      |
| Nodemailer at Edge runtime        | Uses Node.js `net` module — unavailable at Edge               | Only in Server Actions  |
| `@node-rs/argon2`                 | Existing passwords use bcrypt; mixing hashes = migration pain | Keep `bcrypt@6.0.0`     |
| Auth.js `sendVerificationRequest` | That's for email verification, not password reset             | Custom Server Action    |

---

## Stack Patterns by Variant

**If SMTP not configured (empty env vars):**

- Guard in send utility logs warning and returns early
- Prevents crashes on Docker deployments without email
- Document in `.env.example` that SMTP required for email features

**If using Gmail SMTP:**

- `smtp.gmail.com`, port `587`, `SMTP_SECURE=false`
- Requires app password (not account password) if 2FA enabled
- Rate limit: 500 emails/day (fine for self-hosted)

**If using Mailhog/Mailpit for dev:**

- `SMTP_HOST=localhost`, `SMTP_PORT=1025`, no auth
- `SMTP_SECURE=false`
- Good for dev/CI without real email

---

## Version Compatibility

| Package                 | Version | Compatible With | Notes                                        |
| ----------------------- | ------- | --------------- | -------------------------------------------- |
| nodemailer              | 8.0.1   | Node.js 18+     | Zero dependencies, pure JS                   |
| @react-email/components | 1.0.8   | React 18/19     | Peer dep: `^18.0 \|\| ^19.0 \|\| ^19.0.0-rc` |
| react-email             | 5.2.8   | Node.js 20+     | Dev tool only, optional                      |
| @react-email/render     | 2.0.4   | React 18/19     | Included in components package               |

---

## Docker Compatibility

| Package                 | Native Dependencies | Docker Notes                                        |
| ----------------------- | ------------------- | --------------------------------------------------- |
| nodemailer              | None (verified)     | Pure JavaScript. Zero-dep. Fully Docker-compatible. |
| @react-email/components | None                | React-based, server-side rendering. No native code. |
| react-email (dev)       | esbuild (bundled)   | Dev tool only, not in production image.             |

**Verdict:** All recommended packages are Docker-friendly with no native compilation required.

---

## Sources

| Source                                             | What Verified                                                | Confidence |
| -------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| `npm view nodemailer version`                      | v8.0.1 is current, zero dependencies                         | HIGH       |
| `npm view @react-email/components version`         | v1.0.8 is current                                            | HIGH       |
| `npm view react-email version`                     | v5.2.8 is current                                            | HIGH       |
| `npm view nodemailer --json \| jq '.dependencies'` | No dependencies (null)                                       | HIGH       |
| Codebase inspection (`schema.ts`)                  | `authVerificationTokens` exists, structure verified          | HIGH       |
| Codebase inspection (`auth.ts`)                    | DrizzleAdapter configured with verificationTokensTable       | HIGH       |
| Codebase inspection (`package.json`)               | bcrypt@6.0.0, date-fns@4.1.0, React 19.2.3 already installed | HIGH       |

---

_Stack research for: SMTP/Email integration milestone_
_Researched: 2026-02-25_
_Versions verified via npm registry_
