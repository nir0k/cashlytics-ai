# Project Research Summary

**Project:** Cashlytics v1.1 — Email & Password Reset
**Domain:** SMTP Email Infrastructure + Password Reset Flow for Next.js Self-Hosted Financial App
**Researched:** 2026-02-25
**Confidence:** HIGH

## Executive Summary

This milestone adds email capabilities (SMTP sending, password reset, welcome email) to an existing Next.js 16 + Auth.js v5 + Drizzle codebase. The recommended approach uses **Nodemailer** for SMTP transport (pure JS, Docker-friendly) and **@react-email/components** for HTML templates (React-based, inline styles for email client compatibility).

The critical architectural decision is creating a **dedicated `password_reset_tokens` table** — the existing Auth.js `authVerificationTokens` table must NOT be reused, as it's adapter-managed and lacks the `usedAt` column for single-use enforcement. Password reset is a **custom flow** built outside Auth.js, invoked from Server Actions.

Key risks center on security (tokens must be SHA-256 hashed before DB storage), deployment (SMTP env vars must be forwarded in docker-compose.yml), and email rendering (all styles must be inline — Tailwind/CSS variables won't work in email clients). The flow must always return identical responses to prevent email enumeration attacks.

## Key Findings

### Recommended Stack

New packages for this milestone (existing stack remains unchanged):

**Core technologies:**

- **Nodemailer ^8.0.1** — SMTP email sending. Zero dependencies, pure JS, Docker-compatible. Industry standard for Node.js SMTP.
- **@react-email/components ^1.0.8** — React-based email templates with automatic inline style rendering. Supports React 19 (current codebase uses 19.2.3).
- **Node.js `crypto`** — Built-in module for secure token generation. No package needed: `crypto.randomBytes(32).toString('hex')` produces 256-bit tokens.
- **react-email ^5.2.8** (optional, dev only) — Local email preview with hot-reload. Not required for production.

### Expected Features

**Must have (table stakes):**

- Forgot-password page at `/forgot-password` with email field
- "Forgot password?" link on login page
- Password reset email with 1-hour expiry, single-use token
- Reset-password page at `/reset-password?token=...`
- Email enumeration prevention (always same response)
- Welcome email triggered on registration (non-blocking)
- Graceful SMTP-disabled state (app runs without email configured)

**Should have (competitive):**

- Vault-branded dark HTML emails matching app aesthetic
- Rate limiting on forgot-password endpoint (3-5 requests/15min per IP)
- Token invalidation on password change (all other tokens voided)
- Plaintext fallback in emails (spam score improvement)

**Defer (v2+):**

- Email verification required for login (blocks self-hosted without SMTP)
- Magic link login (conflicts with credentials flow)
- Email preview dev route
- Session invalidation on password reset (document limitation for v1.1)

### Architecture Approach

The email infrastructure adds a **lateral service layer** alongside existing auth, not modifying Auth.js internals. Server Actions bridge token utilities and email service.

**Major components:**

1. **`src/lib/email/index.ts`** — Nodemailer singleton transporter, `sendMail()` wrapper with SMTP-disabled guard
2. **`src/lib/email/templates/`** — React Email components for welcome and reset emails
3. **`src/lib/auth/reset-token.ts`** — Token generation, DB operations (create/validate/consume)
4. **`src/actions/email-actions.ts`** — `forgotPasswordAction`, `resetPasswordAction` Server Actions
5. **`src/app/(auth)/forgot-password/` and `reset-password/`** — New pages in existing auth route group
6. **`password_reset_tokens` DB table** — Dedicated table with `tokenHash`, `userId`, `expiresAt`, `usedAt`

### Critical Pitfalls

1. **Transporter created per-request** — Must use module-level singleton. Creating transporter inside Server Action exhausts SMTP connections.
2. **Raw token stored in database** — Store SHA-256 hash only. Raw tokens in DB enable full account takeover on any DB breach.
3. **Reusing `authVerificationTokens` table** — Never reuse Auth.js adapter-managed tables. Create dedicated `password_reset_tokens` table.
4. **SMTP env vars missing from docker-compose.yml** — All SMTP\_\* vars must be explicitly forwarded in `environment:` block.
5. **Email enumeration via response differences** — Always return identical success message regardless of email existence.

## Implications for Roadmap

### Phase 1: DB Schema + Migration

**Rationale:** Foundation must exist before any token logic or pages.
**Delivers:** `password_reset_tokens` table with proper schema
**Uses:** Drizzle ORM, PostgreSQL
**Avoids:** Pitfall #12 (Auth table conflict) — dedicated table from the start
**Files:** `src/lib/db/schema.ts` (modified), `drizzle/0006_*.sql` (new)

### Phase 2: SMTP Infrastructure

**Rationale:** Email sending capability required before any email-triggering flows.
**Delivers:** Nodemailer singleton transporter, sendMail wrapper, graceful SMTP-disabled handling
**Uses:** nodemailer ^8.0.1, docker-compose.yml env forwarding
**Avoids:** Pitfalls #1 (transporter per-request), #7 (Docker env missing), #13 (APP_URL validation)
**Files:** `src/lib/email/index.ts`, `src/lib/email/transport.ts`, `.env.example`, `docker-compose.yml`

### Phase 3: Email Templates

**Rationale:** Templates must exist before server actions can send emails.
**Delivers:** Vault-branded dark HTML templates with inline styles, plaintext fallbacks
**Uses:** @react-email/components
**Avoids:** Pitfalls #8 (CSS/Tailwind in email), #15 (spam folder)
**Files:** `src/lib/email/templates/welcome.tsx`, `src/lib/email/templates/reset.tsx`

### Phase 4: Token Utilities

**Rationale:** Token lifecycle logic required before server actions can implement flows.
**Delivers:** Token generation, validation, consumption with single-use enforcement
**Uses:** Node.js crypto, Drizzle queries
**Avoids:** Pitfalls #2 (raw token), #3 (timing attack), #4 (low entropy), #5 (reuse)
**Files:** `src/lib/auth/reset-token.ts`

### Phase 5: Server Actions + Validation

**Rationale:** Actions depend on email service, token utilities, and validation schemas.
**Delivers:** `forgotPasswordAction`, `resetPasswordAction`, Zod schemas, rate limiting
**Uses:** All prior phases, existing `rateLimit()` utility
**Avoids:** Pitfalls #9 (enumeration), #14 (rate limits)
**Files:** `src/actions/email-actions.ts`, `src/lib/validations/auth.ts` (extended)

### Phase 6: Pages + UI Components

**Rationale:** Presentation layer depends on server actions being complete.
**Delivers:** Forgot-password page, reset-password page, form components
**Uses:** Existing auth layout, useActionState pattern
**Avoids:** Pitfall #6 (proxy.ts not updated)
**Files:** `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`, form components

### Phase 7: Integration + Welcome Email

**Rationale:** Final integration touches existing `registerAction` without breaking it.
**Delivers:** Welcome email triggered on registration (fire-and-forget)
**Avoids:** Pitfall #10 (blocking registration)
**Files:** `src/actions/auth-actions.ts` (modified)

### Phase Ordering Rationale

- **DB first**: Token table is a hard dependency for all token logic
- **SMTP second**: Email service is dependency for templates and actions
- **Templates before actions**: Actions need to call `sendMail` with rendered HTML
- **Token utils before actions**: Actions query the token table
- **Actions before pages**: Forms call server actions
- **Integration last**: Minimizes risk to existing registration flow

### Research Flags

Phases likely needing deeper research during planning:

- **None identified** — All phases have well-documented patterns and high-confidence research

Phases with standard patterns (skip research-phase):

- **All phases** — Nodemailer, Drizzle migrations, React Email, Server Actions, and Auth.js v5 integration are all well-documented with established patterns.

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------------- |
| Stack        | HIGH       | Versions verified via npm registry 2026-02-25. All packages pure-JS, Docker-compatible.              |
| Features     | HIGH       | Based on codebase analysis, existing patterns, and standard security practices.                      |
| Architecture | HIGH       | Direct codebase analysis + Auth.js v5 official patterns + Nodemailer documentation.                  |
| Pitfalls     | HIGH       | Core security and Nodemailer patterns well-established. MEDIUM on Auth.js v5 beta-specific behavior. |

**Overall confidence:** HIGH

### Gaps to Address

- **Session invalidation on password reset**: JWT sessions (current approach) remain valid after password change. Research recommends documenting this limitation for v1.1 and adding session versioning in v2+. Implementation should either add `sessionVersion` field or explicitly document the limitation in user-facing docs.

- **SPF/DKIM/DMARC configuration**: DNS-level email authentication is outside application code. Deployment documentation must include deliverability requirements. Test with mail-tester.com before production.

- **Auth.js v5 beta stability**: Current version is `5.0.0-beta.30`. API may change. Monitor Auth.js releases during implementation.

## Sources

### Primary (HIGH confidence)

- `npm view nodemailer version` — v8.0.1 current, zero dependencies
- `npm view @react-email/components version` — v1.0.8 current
- Codebase inspection: `src/lib/db/schema.ts`, `src/actions/auth-actions.ts`, `src/proxy.ts`, `docker-compose.yml`
- Nodemailer documentation: https://nodemailer.com/about/
- OWASP Forgot Password Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- Node.js crypto.randomBytes: https://nodejs.org/api/crypto.html

### Secondary (MEDIUM confidence)

- Auth.js v5 Drizzle Adapter: https://authjs.dev/getting-started/adapters/drizzle
- React Email documentation: https://react.email/docs
- Email client CSS compatibility (Campaign Monitor): https://www.campaignmonitor.com/css/

### Tertiary (contextual)

- Gmail SMTP limits: https://support.google.com/a/answer/176600
- Mailpit (dev mail catcher): https://github.com/axllent/mailpit
- Mail Tester (deliverability): https://www.mail-tester.com/

---

_Research completed: 2026-02-25_
_Ready for roadmap: yes_
