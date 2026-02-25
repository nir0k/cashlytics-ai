# Requirements: Cashlytics v1.1

**Defined:** 2026-02-25
**Core Value:** Jeder User sieht nur seine eigenen Finanzdaten — sicher isoliert auf Database- und Middleware-Ebene.

## v1.1 Requirements

### SMTP Configuration

- [ ] **SMTP-01**: User can configure SMTP settings via `.env` (HOST, PORT, USER, PASS, FROM)
- [ ] **SMTP-02**: App runs gracefully when SMTP is not configured (email features disabled, no crashes)
- [ ] **SMTP-03**: SMTP env vars are forwarded in docker-compose.yml for Docker deployments
- [ ] **SMTP-04**: APP_URL env var is used for generating reset links in emails

### Password Reset Flow

- [ ] **RESET-01**: User can request password reset via forgot-password page with email field
- [ ] **RESET-02**: "Forgot password?" link is visible on login page
- [ ] **RESET-03**: Reset token is cryptographically secure (256-bit, `crypto.randomBytes`)
- [ ] **RESET-04**: Reset token expires after 1 hour
- [ ] **RESET-05**: Reset token is single-use (marked as used after successful reset)
- [ ] **RESET-06**: Reset token is stored as SHA-256 hash in database (never raw token)
- [ ] **RESET-07**: Forgot-password action always returns identical success response (email enumeration prevention)
- [ ] **RESET-08**: User can reset password via `/reset-password?token=...` page
- [ ] **RESET-09**: Invalid or expired tokens show clear error message
- [ ] **RESET-10**: All other reset tokens are invalidated when user successfully changes password
- [ ] **RESET-11**: Dedicated `password_reset_tokens` table exists (not reusing Auth.js tables)

### Welcome Email

- [ ] **WELCOME-01**: User receives welcome email after successful registration
- [ ] **WELCOME-02**: Welcome email is sent non-blocking (registration doesn't wait for email)
- [ ] **WELCOME-03**: Welcome email failure doesn't affect registration success

### Email Templates

- [ ] **TEMPLATES-01**: Reset password email uses Vault-branded dark HTML template
- [ ] **TEMPLATES-02**: Welcome email uses Vault-branded dark HTML template
- [ ] **TEMPLATES-03**: All email styles are inline (Tailwind/CSS variables don't work in email clients)
- [ ] **TEMPLATES-04**: Emails include plaintext fallback for spam score improvement
- [ ] **TEMPLATES-05**: Reset email includes token expiry notice (1 hour)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Session Management

- **SESS-01**: JWT sessions are invalidated on password reset (requires session versioning)

### Email Verification

- **VERIFY-01**: User must verify email before login (blocks self-hosted without SMTP)
- **VERIFY-02**: Email verification reminder emails

### Rate Limiting

- **RATE-01**: Forgot-password endpoint has rate limiting (3-5 requests/15min per IP)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                                | Reason                                                     |
| -------------------------------------- | ---------------------------------------------------------- |
| OAuth Provider (Google, GitHub)        | Can be added later, not v1.1 scope                         |
| Email verification required for login  | Blocks self-hosted users without SMTP                      |
| Magic link login                       | Conflicts with credentials flow, Auth.js pattern different |
| Email preview dev route                | Nice-to-have, not required for production                  |
| Session invalidation on password reset | Requires DB schema change, document limitation for v1.1    |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement  | Phase   | Status  |
| ------------ | ------- | ------- |
| SMTP-01      | Phase ? | Pending |
| SMTP-02      | Phase ? | Pending |
| SMTP-03      | Phase ? | Pending |
| SMTP-04      | Phase ? | Pending |
| RESET-01     | Phase ? | Pending |
| RESET-02     | Phase ? | Pending |
| RESET-03     | Phase ? | Pending |
| RESET-04     | Phase ? | Pending |
| RESET-05     | Phase ? | Pending |
| RESET-06     | Phase ? | Pending |
| RESET-07     | Phase ? | Pending |
| RESET-08     | Phase ? | Pending |
| RESET-09     | Phase ? | Pending |
| RESET-10     | Phase ? | Pending |
| RESET-11     | Phase ? | Pending |
| WELCOME-01   | Phase ? | Pending |
| WELCOME-02   | Phase ? | Pending |
| WELCOME-03   | Phase ? | Pending |
| TEMPLATES-01 | Phase ? | Pending |
| TEMPLATES-02 | Phase ? | Pending |
| TEMPLATES-03 | Phase ? | Pending |
| TEMPLATES-04 | Phase ? | Pending |
| TEMPLATES-05 | Phase ? | Pending |

**Coverage:**

- v1.1 requirements: 23 total
- Mapped to phases: 0
- Unmapped: 23 ⚠️

---

_Requirements defined: 2026-02-25_
_Last updated: 2026-02-25 after initial definition_
