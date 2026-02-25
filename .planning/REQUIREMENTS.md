# Requirements: Cashlytics v1.1

**Defined:** 2026-02-25
**Core Value:** Jeder User sieht nur seine eigenen Finanzdaten — sicher isoliert auf Database- und Middleware-Ebene.

## v1.1 Requirements

### SMTP Configuration

- [x] **SMTP-01**: User can configure SMTP settings via `.env` (HOST, PORT, USER, PASS, FROM)
- [x] **SMTP-02**: App runs gracefully when SMTP is not configured (email features disabled, no crashes)
- [x] **SMTP-03**: SMTP env vars are forwarded in docker-compose.yml for Docker deployments
- [x] **SMTP-04**: APP_URL env var is used for generating reset links in emails

### Password Reset Flow

- [x] **RESET-01**: User can request password reset via forgot-password page with email field
- [ ] **RESET-02**: "Forgot password?" link is visible on login page
- [x] **RESET-03**: Reset token is cryptographically secure (256-bit, `crypto.randomBytes`)
- [x] **RESET-04**: Reset token expires after 1 hour
- [x] **RESET-05**: Reset token is single-use (marked as used after successful reset)
- [x] **RESET-06**: Reset token is stored as SHA-256 hash in database (never raw token)
- [x] **RESET-07**: Forgot-password action always returns identical success response (email enumeration prevention)
- [x] **RESET-08**: User can reset password via `/reset-password?token=...` page
- [x] **RESET-09**: Invalid or expired tokens show clear error message
- [x] **RESET-10**: All other reset tokens are invalidated when user successfully changes password
- [x] **RESET-11**: Dedicated `password_reset_tokens` table exists (not reusing Auth.js tables)

### Welcome Email

- [ ] **WELCOME-01**: User receives welcome email after successful registration
- [ ] **WELCOME-02**: Welcome email is sent non-blocking (registration doesn't wait for email)
- [ ] **WELCOME-03**: Welcome email failure doesn't affect registration success

### Email Templates

- [x] **TEMPLATES-01**: Reset password email uses Vault-branded dark HTML template
- [x] **TEMPLATES-02**: Welcome email uses Vault-branded dark HTML template
- [x] **TEMPLATES-03**: All email styles are inline (Tailwind/CSS variables don't work in email clients)
- [x] **TEMPLATES-04**: Emails include plaintext fallback for spam score improvement
- [x] **TEMPLATES-05**: Reset email includes token expiry notice (1 hour)

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

| Requirement  | Phase    | Status   |
| ------------ | -------- | -------- |
| SMTP-01      | Phase 7  | Complete |
| SMTP-02      | Phase 7  | Complete |
| SMTP-03      | Phase 7  | Complete |
| SMTP-04      | Phase 7  | Complete |
| RESET-01     | Phase 10 | Complete |
| RESET-02     | Phase 11 | Pending  |
| RESET-03     | Phase 9  | Complete |
| RESET-04     | Phase 9  | Complete |
| RESET-05     | Phase 9  | Complete |
| RESET-06     | Phase 9  | Complete |
| RESET-07     | Phase 10 | Complete |
| RESET-08     | Phase 10 | Complete |
| RESET-09     | Phase 10 | Complete |
| RESET-10     | Phase 9  | Complete |
| RESET-11     | Phase 6  | Complete |
| WELCOME-01   | Phase 12 | Pending  |
| WELCOME-02   | Phase 12 | Pending  |
| WELCOME-03   | Phase 12 | Pending  |
| TEMPLATES-01 | Phase 8  | Complete |
| TEMPLATES-02 | Phase 8  | Complete |
| TEMPLATES-03 | Phase 8  | Complete |
| TEMPLATES-04 | Phase 8  | Complete |
| TEMPLATES-05 | Phase 8  | Complete |

**Coverage:**

- v1.1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---

_Requirements defined: 2026-02-25_
_Last updated: 2026-02-25 after roadmap creation_
