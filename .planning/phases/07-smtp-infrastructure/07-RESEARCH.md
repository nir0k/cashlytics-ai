# Phase 7: SMTP Infrastructure - Research

**Researched:** 2026-02-25
**Domain:** Email sending via SMTP with Nodemailer
**Confidence:** HIGH

## Summary

Nodemailer is the de-facto standard for sending emails from Node.js applications, with zero runtime dependencies and built-in TLS/STARTTLS support. This phase implements a singleton transporter pattern that gracefully degrades when SMTP is not configured, enabling self-hosted deployments without email capability.

**Primary recommendation:** Create `src/lib/email/transporter.ts` with lazy singleton initialization, checking for SMTP configuration at runtime and returning a disabled state when not configured.

## Phase Requirements

| ID      | Description                                                                           | Research Support                                                                                        |
| ------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| SMTP-01 | User can configure SMTP settings via `.env` (HOST, PORT, USER, PASS, FROM)            | Environment variable pattern established in .env.example; Nodemailer accepts these as transport options |
| SMTP-02 | App runs gracefully when SMTP is not configured (email features disabled, no crashes) | Lazy transporter initialization with `isConfigured` flag; early return from send functions              |
| SMTP-03 | SMTP env vars are forwarded in docker-compose.yml for Docker deployments              | Add to `environment:` section following existing DATABASE_URL/AUTH_SECRET pattern                       |
| SMTP-04 | APP_URL env var is used for generating reset links in emails                          | Already exists as `NEXT_PUBLIC_APP_URL`; create `APP_URL` for server-side use                           |

## Standard Stack

### Core

| Library    | Version | Purpose              | Why Standard                                                                                     |
| ---------- | ------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| nodemailer | ^8.0.0  | SMTP email transport | Most popular Node.js email library (17.5k GitHub stars), zero runtime dependencies, built-in TLS |

### Supporting

| Library           | Version | Purpose                     | When to Use                                             |
| ----------------- | ------- | --------------------------- | ------------------------------------------------------- |
| @types/nodemailer | ^6.4.17 | TypeScript type definitions | Development only - official types maintained separately |

**Installation:**

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

### Alternatives Considered

| Instead of | Could Use      | Tradeoff                                  |
| ---------- | -------------- | ----------------------------------------- |
| nodemailer | @sendgrid/mail | Vendor lock-in, requires SendGrid account |
| nodemailer | aws-sdk (SES)  | AWS-only, overkill for simple SMTP        |
| nodemailer | postmark       | Vendor lock-in, requires Postmark account |

## Architecture Patterns

### Recommended Project Structure

```
src/lib/
├── email/
│   ├── index.ts           # Public API - sendEmail, isEmailConfigured
│   ├── transporter.ts     # Singleton nodemailer transport
│   └── types.ts           # EmailOptions interface
├── logger.ts              # Existing logger for email errors
└── db/
    └── ...
```

### Pattern 1: Lazy Singleton Transporter

**What:** Create transporter on first access, cache for subsequent calls. Check configuration at initialization time.
**When to use:** All email sending operations - ensures single connection pool and graceful degradation.
**Example:**

```typescript
import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

let transporter: nodemailer.Transporter | null = null;
let configChecked = false;
let isConfigured = false;

function getSmtpConfig(): SmtpConfig | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return {
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: SMTP_FROM || SMTP_USER,
  };
}

export function isEmailConfigured(): boolean {
  if (!configChecked) {
    configChecked = true;
    isConfigured = getSmtpConfig() !== null;
  }
  return isConfigured;
}

export function getTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }

  const config = getSmtpConfig();
  if (!config) {
    logger.warn("SMTP not configured - email features disabled", "email");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
}
```

**Source:** nodemailer.com documentation, project patterns from `src/lib/db/index.ts`

### Pattern 2: Safe Send Function with Graceful Degradation

**What:** Email send function that returns early when SMTP not configured, never throws.
**When to use:** All email sending (password reset, welcome email).
**Example:**

```typescript
import { getTransporter, isEmailConfigured } from "./transporter";
import { logger } from "@/lib/logger";

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    logger.info(`Email not sent (SMTP not configured): ${options.to}`, "email");
    return { success: false, error: "SMTP_NOT_CONFIGURED" };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { success: false, error: "TRANSPORTER_UNAVAILABLE" };
  }

  const config = getSmtpConfig();

  try {
    await transporter.sendMail({
      from: config!.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    logger.info(`Email sent: ${options.to}`, "email");
    return { success: true };
  } catch (error) {
    logger.error(`Email send failed: ${options.to}`, "email", error);
    return { success: false, error: "SEND_FAILED" };
  }
}
```

### Anti-Patterns to Avoid

- **Creating transporter on every send:** Connection overhead, no connection pooling
- **Throwing on missing SMTP config:** Breaks app for self-hosted users without SMTP
- **Synchronous transporter.verify() on startup:** Blocks app startup if SMTP slow/unreachable
- **Hardcoded SMTP settings:** Can't configure per-environment

## Don't Hand-Roll

| Problem                 | Don't Build               | Use Instead                     | Why                                         |
| ----------------------- | ------------------------- | ------------------------------- | ------------------------------------------- |
| SMTP connection pooling | Custom connection manager | nodemailer built-in pooling     | Handles reconnection, timeouts, rate limits |
| Email validation        | Regex for email format    | nodemailer's address parser     | RFC 5322 is complex, handles edge cases     |
| HTML to plaintext       | Custom HTML stripper      | nodemailer's built-in generator | Preserves formatting, handles encoding      |

## Common Pitfalls

### Pitfall 1: Port Confusion (587 vs 465)

**What goes wrong:** Using `secure: true` on port 587 causes connection failures.
**Why it happens:** Port 465 uses implicit TLS (secure: true), port 587 uses STARTTLS (secure: false).
**How to avoid:** `secure: config.port === 465` - auto-detect based on port.
**Warning signs:** ETIMEDOUT, connection reset errors.

### Pitfall 2: Environment Variable Type Coercion

**What goes wrong:** `SMTP_PORT` as string causes "port must be a number" error.
**Why it happens:** All env vars are strings in Node.js.
**How to avoid:** `parseInt(SMTP_PORT, 10)` with validation.
**Warning signs:** "invalid port" errors, NaN issues.

### Pitfall 3: Missing FROM Address

**What goes wrong:** Some SMTP servers reject emails without valid FROM address.
**Why it happens:** FROM is often optional in dev, required in production.
**How to avoid:** Default to SMTP_USER if SMTP_FROM not set: `SMTP_FROM || SMTP_USER`.
**Warning signs:** 550 5.7.1 sender rejected errors.

### Pitfall 4: APP_URL vs NEXT_PUBLIC_APP_URL

**What goes wrong:** Using client-side `NEXT_PUBLIC_APP_URL` in server code exposes build-time value, not runtime.
**Why it happens:** Next.js inlines NEXT*PUBLIC*\* at build time.
**How to avoid:** Create separate `APP_URL` env var for server-side URL generation.
**Warning signs:** Reset links pointing to localhost in production.

## Code Examples

### Environment Variables

```bash
# .env.example addition
# --------------------------------------------
# SMTP Configuration (Optional)
# --------------------------------------------
# SMTP server hostname
SMTP_HOST=smtp.example.com

# SMTP port (587 for STARTTLS, 465 for implicit TLS)
SMTP_PORT=587

# SMTP authentication
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-password

# From address for outgoing emails (defaults to SMTP_USER)
SMTP_FROM=noreply@example.com

# Server-side app URL for email links (required if SMTP configured)
APP_URL=https://your-domain.com
```

### Docker Compose Addition

```yaml
environment:
  # ... existing vars ...
  - SMTP_HOST=${SMTP_HOST}
  - SMTP_PORT=${SMTP_PORT}
  - SMTP_USER=${SMTP_USER}
  - SMTP_PASS=${SMTP_PASS}
  - SMTP_FROM=${SMTP_FROM}
  - APP_URL=${APP_URL}
```

### Public API Export

```typescript
// src/lib/email/index.ts
export { sendEmail, isEmailConfigured } from "./transporter";
export type { SendEmailOptions } from "./types";
```

## State of the Art

| Old Approach                 | Current Approach      | When Changed      | Impact                               |
| ---------------------------- | --------------------- | ----------------- | ------------------------------------ |
| Callback-based sendMail      | async/await           | Node.js 8+        | Cleaner error handling               |
| Explicit verify() on startup | Lazy initialization   | Modern patterns   | Faster startup, graceful degradation |
| Hardcoded credentials        | Environment variables | 12-factor app era | Configuration per environment        |

**Deprecated/outdated:**

- `nodemailer-smtp-transport`: Built into nodemailer since v2
- `direct transport`: Most ISPs block port 25, use relay instead

## Open Questions

1. **Should we verify SMTP connection on first send?**
   - What we know: `transporter.verify()` tests connection but adds latency
   - What's unclear: Trade-off between fail-fast vs performance
   - Recommendation: Skip verify on startup, let first send fail naturally with logged error

2. **Should APP_URL fall back to NEXT_PUBLIC_APP_URL?**
   - What we know: NEXT*PUBLIC*\* vars are inlined at build time
   - What's unclear: Whether this causes issues with Docker builds
   - Recommendation: Require separate APP_URL, document clearly in .env.example

## Sources

### Primary (HIGH confidence)

- https://nodemailer.com/ - Official documentation (accessed 2026-02-25)
- https://github.com/nodemailer/nodemailer - Official repository, 17.5k stars
- Project codebase patterns: `src/lib/db/index.ts`, `src/lib/logger.ts`

### Secondary (MEDIUM confidence)

- Next.js environment variable documentation (established pattern)
- Docker Compose environment variable forwarding (established pattern)

### Tertiary (LOW confidence)

- None required - nodemailer documentation is comprehensive

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Nodemailer is industry standard, documentation verified
- Architecture: HIGH - Singleton pattern matches existing project patterns (db/index.ts)
- Pitfalls: HIGH - Common nodemailer issues well-documented

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable library, 30-day validity)
