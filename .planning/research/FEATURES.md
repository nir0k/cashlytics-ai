# Feature Research: Multi-Tenant Financial App Authentication

**Domain:** Multi-User Authentication for Self-Hosted Financial Application
**Researched:** 2026-02-24
**Confidence:** HIGH (Auth.js docs + competitor analysis verified)

---

## Executive Summary

Self-hosted financial apps like Firefly III and Actual Budget establish a clear baseline for authentication features: email/password credentials, session management, and strict data isolation are non-negotiable. For Cashlytics, the key differentiator is **registration mode control** — enabling single-user self-hosted deployments while supporting multi-user SaaS scenarios. OAuth providers, 2FA, and password reset are differentiators, not table stakes, and should be deferred.

---

## Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or insecure.

| Feature                           | Why Expected                                         | Complexity | Notes                                                                           |
| --------------------------------- | ---------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| **Email/Password Authentication** | Every self-hosted app has this; it's the baseline    | LOW        | Auth.js Credentials provider; Zod validation for email format + password length |
| **Secure Password Hashing**       | Financial data requires strong security              | LOW        | bcrypt (Docker-friendly) or argon2 (stronger, native compilation)               |
| **Session Persistence**           | Users expect to stay logged in between visits        | LOW        | JWT cookies (default) or database sessions; HttpOnly + Secure flags             |
| **Protected Routes**              | Unauthenticated users can't access financial data    | LOW        | Next.js 16 proxy.ts with `authorized` callback; redirects to /login             |
| **Logout Functionality**          | Basic expectation; clears session                    | LOW        | `signOut()` from Auth.js; destroys cookie                                       |
| **Row-Level Data Isolation**      | Each user sees only their own accounts/expenses      | MEDIUM     | userId FK on all tables; every query filtered by session.user.id                |
| **Registration Mode Control**     | Self-hosted apps need single-user mode               | MEDIUM     | `.env` flag: `SINGLE_USER_MODE=true` + `SINGLE_USER_EMAIL=user@example.com`     |
| **CSRF Protection**               | Built into Auth.js; expected for any form-based auth | LOW        | Automatic with Auth.js; no extra work                                           |
| **Secure Cookie Storage**         | Session tokens must be HttpOnly, Secure, SameSite    | LOW        | Auth.js default configuration                                                   |

### Table Stakes Implementation Notes

**Registration Mode Control** is the critical table-stakes feature for this project. Self-hosted financial apps typically operate in one of two modes:

1. **Single-User Mode** (default for self-hosted):
   - Only one user can exist, defined by `.env`
   - Registration disabled after initial setup
   - Migration assigns existing data to this user
   - Simpler UX: no login required if only one user exists (optional enhancement)

2. **Multi-User Mode** (for SaaS or family deployments):
   - Open registration or invite-only
   - Each user gets isolated data
   - Standard authentication flow

---

## Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable for specific use cases.

| Feature                              | Value Proposition                                                   | Complexity | Notes                                                                               |
| ------------------------------------ | ------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| **Two-Factor Authentication (2FA)**  | Major security enhancement for financial data; Firefly III has this | HIGH       | TOTP via authenticator apps; requires QR code generation, secret storage            |
| **Password Reset Flow**              | Users can recover access without admin intervention                 | MEDIUM     | Requires email service (Resend, SendGrid); verification tokens table already exists |
| **Email Verification**               | Confirm user owns the email address                                 | MEDIUM     | Verification tokens table exists; needs email service integration                   |
| **Session Management UI**            | Users can see active sessions, revoke them ("Sign out everywhere")  | MEDIUM     | Requires database sessions (not JWT); display device/location info                  |
| **Magic Link / Passwordless Auth**   | Better UX; no password to forget                                    | MEDIUM     | Auth.js Email provider; requires email service                                      |
| **OAuth Providers (Google, GitHub)** | Faster login; no password management                                | MEDIUM     | Auth.js has built-in providers; adds external dependency                            |
| **Passkeys / WebAuthn**              | Future-proof; phishing-resistant                                    | HIGH       | Auth.js supports WebAuthn (experimental); requires HTTPS                            |
| **Device Trust / Extended Sessions** | "Remember me" for trusted devices                                   | LOW        | Extend session expiry for specific devices                                          |
| **Login Rate Limiting**              | Prevent brute force attacks                                         | LOW        | Per-IP or per-email rate limiting on auth endpoints                                 |
| **Audit Log**                        | Track all authentication events for security review                 | MEDIUM     | Log login attempts, password changes, session creations                             |

### Differentiator Prioritization for Financial Apps

**Tier 1 (Should Add After MVP):**

1. Password Reset Flow — users will lock themselves out
2. 2FA — financial data warrants extra security

**Tier 2 (Nice to Have):** 3. Session Management UI — visibility into account security 4. Login Rate Limiting — basic protection against attacks

**Tier 3 (Future):** 5. OAuth Providers — convenience, not security 6. Magic Links — UX improvement 7. Passkeys — cutting edge, low adoption currently

---

## Anti-Features (Deliberately NOT Build)

Features that seem good but create problems for this use case.

| Anti-Feature                              | Why Requested                            | Why Problematic                                                                         | What to Do Instead                                                                 |
| ----------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Role-Based Access Control (RBAC)**      | "Admin can see all users' data"          | Adds complexity; project scope says "all users are equal"; not needed for single-tenant | Keep flat user model; defer RBAC indefinitely                                      |
| **Team / Organization Features**          | "Share accounts with spouse"             | Major architecture change; requires shared data model, permissions                      | Defer; current architecture is per-user isolation                                  |
| **Social-Only Login (No Password)**       | "Just use Google login"                  | Self-hosted apps shouldn't depend on external OAuth providers; offline access breaks    | Always support email/password; OAuth is optional add-on                            |
| **Never-Expiring Sessions**               | "Don't make me log in again"             | Security risk for financial data; session hijacking exposure                            | Reasonable session expiry (7-30 days); "remember me" extends but doesn't eliminate |
| **Password Requirements Too Strict**      | "Must have 2 uppercase, 3 symbols, etc." | Frustrating UX; self-hosted users are admins of their own instance                      | Reasonable defaults (8+ chars); let admins customize via .env if desired           |
| **Email Verification Required for Login** | "Verify email before accessing app"      | Blocks self-hosted users without email service configured                               | Make email verification optional; allow immediate access, verify later             |
| **Complex Password Recovery Questions**   | "Mother's maiden name?"                  | Security theater; easily discoverable; rarely used correctly                            | 2FA or recovery codes are better alternatives                                      |
| **Concurrent Session Limits**             | "Only one device at a time"              | Frustrating for legitimate use; hard to implement correctly                             | Session management UI lets users self-manage                                       |

### Anti-Feature Rationale

The project explicitly states in PROJECT.md:

- OAuth Provider — "kann später ergänzt werden"
- Role-based Access Control — "alle User sind gleich"
- Email Verification — "Password-Reset via Email später"
- Password Reset Flow — "später"
- Team/Organization Features — "Single-Tenant pro Instanz"

This research confirms these deferrals are correct. Focus on table stakes first.

---

## Feature Dependencies

```
Email/Password Auth
    └──requires──> Secure Password Hashing
    └──requires──> Session Persistence
    └──requires──> Protected Routes
    └──requires──> Row-Level Data Isolation

Registration Mode Control
    └──requires──> Email/Password Auth
    └──requires──> Database with userId FKs

Password Reset Flow
    └──requires──> Email Service (Resend/SendGrid)
    └──requires──> Email/Password Auth
    └──uses──> verificationTokens table (exists in Auth.js schema)

2FA (TOTP)
    └──requires──> Email/Password Auth
    └──requires──> QR Code generation library
    └──requires──> Secret storage in users table

Session Management UI
    └──requires──> Database Sessions (not JWT)
    └──conflicts──> JWT Session Strategy

OAuth Providers
    └──requires──> Email/Password Auth (for fallback)
    └──requires──> External OAuth app registration

Magic Link Auth
    └──requires──> Email Service
    └──requires──> verificationTokens table
    └──conflicts──> Credentials Provider (user expectation of password)
```

### Dependency Notes

- **Session Management UI requires Database Sessions:** JWT sessions cannot be revoked server-side. If you want "sign out everywhere" functionality, you must use database sessions (`session: { strategy: 'database' }`).

- **Password Reset requires Email Service:** Self-hosted users may not have email configured. Make this optional and graceful — show a "contact administrator" message if email is not configured.

- **2FA can be added incrementally:** Start with TOTP (Google Authenticator, etc.). WebAuthn/Passkeys are more complex and can come later.

---

## MVP Definition

### Launch With (v1)

Minimum viable multi-user authentication — what's needed to validate the core value.

- [x] **Email/Password Authentication** — Credentials provider with bcrypt hashing
- [x] **Secure Session Management** — JWT cookies with HttpOnly, Secure, SameSite
- [x] **Protected Routes** — proxy.ts redirects unauthenticated users to /login
- [x] **Row-Level Data Isolation** — Every query filtered by session.user.id
- [x] **Logout Functionality** — signOut() clears session
- [x] **Registration Mode Control** — SINGLE_USER_MODE and SINGLE_USER_EMAIL from .env
- [x] **Login/Register Pages** — Simple forms with email/password
- [x] **Data Migration** — Assign existing data to single user on upgrade

### Add After Validation (v1.x)

Features to add once core auth is working and validated.

- [ ] **Password Reset Flow** — Email-based recovery; trigger: users getting locked out
- [ ] **Login Rate Limiting** — Per-IP throttling; trigger: security concerns
- [ ] **2FA (TOTP)** — Authenticator app support; trigger: users requesting more security
- [ ] **Session Management UI** — See active sessions; trigger: users wanting visibility

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **OAuth Providers** — Google/GitHub login; trigger: user feedback requesting convenience
- [ ] **Magic Link Auth** — Passwordless; trigger: UX improvement initiative
- [ ] **Passkeys/WebAuthn** — Phishing-resistant; trigger: browser adoption increases
- [ ] **Email Verification** — Confirm email ownership; trigger: SaaS deployment
- [ ] **Audit Logging** — Security events; trigger: compliance requirements

---

## Feature Prioritization Matrix

| Feature                   | User Value | Implementation Cost | Priority |
| ------------------------- | ---------- | ------------------- | -------- |
| Email/Password Auth       | HIGH       | LOW                 | P1       |
| Secure Password Hashing   | HIGH       | LOW                 | P1       |
| Session Persistence       | HIGH       | LOW                 | P1       |
| Protected Routes          | HIGH       | LOW                 | P1       |
| Row-Level Data Isolation  | HIGH       | MEDIUM              | P1       |
| Registration Mode Control | HIGH       | MEDIUM              | P1       |
| Logout Functionality      | HIGH       | LOW                 | P1       |
| Login/Register Pages      | HIGH       | LOW                 | P1       |
| Password Reset Flow       | MEDIUM     | MEDIUM              | P2       |
| Login Rate Limiting       | MEDIUM     | LOW                 | P2       |
| 2FA (TOTP)                | MEDIUM     | HIGH                | P2       |
| Session Management UI     | LOW        | MEDIUM              | P3       |
| OAuth Providers           | LOW        | MEDIUM              | P3       |
| Magic Link Auth           | LOW        | MEDIUM              | P3       |
| Passkeys/WebAuthn         | LOW        | HIGH                | P3       |
| Audit Logging             | LOW        | MEDIUM              | P3       |

**Priority key:**

- P1: Must have for launch (table stakes)
- P2: Should have, add when possible (differentiators with good ROI)
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature            | Firefly III  | Actual Budget   | Cashlytics Approach |
| ------------------ | ------------ | --------------- | ------------------- |
| Email/Password     | ✓            | ✓               | ✓ P1                |
| OAuth Providers    | ✓ (optional) | ✗               | Defer P3            |
| 2FA (TOTP)         | ✓            | ✗               | P2 after MVP        |
| Password Reset     | ✓            | ✓               | P2 after MVP        |
| Email Verification | Optional     | ✗               | Defer               |
| Session Management | Basic        | Basic           | P3                  |
| Multi-User         | ✓            | Limited         | ✓ Core feature      |
| Single-User Mode   | ✓            | ✓ (local-first) | ✓ Core feature      |

### Key Insights from Competitors

1. **Firefly III** has the most comprehensive auth feature set (2FA, OAuth, password reset). It's been in development since 2014 and added these incrementally.

2. **Actual Budget** is "local-first" with optional sync server. Auth is simpler because the primary use case is single-user local access.

3. **Cashlytics** sits between these: self-hosted like Firefly III, but with a simpler initial scope. Focus on P1 features first, then iterate.

---

## Sources

| Source                                                                                        | What Verified                               | Confidence |
| --------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------- |
| [Auth.js Credentials Provider](https://authjs.dev/getting-started/authentication/credentials) | Email/password auth pattern, Zod validation | HIGH       |
| [Auth.js Session Strategies](https://authjs.dev/concepts/session-strategies)                  | JWT vs database sessions, trade-offs        | HIGH       |
| [Auth.js Database Models](https://authjs.dev/concepts/database-models)                        | Required tables, verification tokens        | HIGH       |
| [Firefly III GitHub](https://github.com/firefly-iii/firefly-iii)                              | 2FA as feature, self-hosted auth patterns   | HIGH       |
| [Actual Budget GitHub](https://github.com/actualbudget/actual)                                | Local-first auth, minimal auth scope        | HIGH       |
| [Auth.js Drizzle Adapter](https://authjs.dev/getting-started/adapters/drizzle)                | Schema requirements, adapter setup          | HIGH       |
| PROJECT.md (project constraints)                                                              | Out of scope features, single-user mode     | HIGH       |

---

_Feature research for: Auth.js v5 + Multi-User Authentication_
_Researched: 2026-02-24_
