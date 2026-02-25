# Roadmap: Cashlytics v1.1 Email & Password Reset

## Overview

This milestone adds SMTP-based email infrastructure and a complete password reset flow to Cashlytics. Users can reset forgotten passwords via secure token-based email links, and receive welcome emails after registration. The implementation uses Nodemailer for SMTP transport and React Email for branded HTML templates.

## Milestones

- ✅ **v1.0 Multi-User Auth** - Phases 1-5 (shipped 2026-02-25)
- 🚧 **v1.1 Email & Password Reset** - Phases 6-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 Multi-User Auth (Phases 1-5) - SHIPPED 2026-02-25</summary>

- [x] Phase 1: Core Auth Infrastructure (3/3 plans) — completed 2026-02-24
- [x] Phase 2: Database Migration (4/4 plans) — completed 2026-02-24
- [x] Phase 3: Server Actions Refactor (5/5 plans) — completed 2026-02-24
- [x] Phase 4: Auth UI Components (4/4 plans) — completed 2026-02-24
- [x] Phase 5: Registration Mode Logic (2/2 plans) — completed 2026-02-25

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Email & Password Reset (In Progress)

**Milestone Goal:** SMTP-Infrastruktur und vollständiger Password-Reset-Flow via tokenbasierter Email

- [ ] **Phase 6: Database Schema** - Dedicated password reset tokens table
- [ ] **Phase 7: SMTP Infrastructure** - Nodemailer transporter with graceful degradation
- [ ] **Phase 8: Email Templates** - Vault-branded HTML templates with inline styles
- [ ] **Phase 9: Token Security** - Cryptographic token generation and lifecycle
- [ ] **Phase 10: Reset Flow Actions** - Server actions for forgot/reset password
- [ ] **Phase 11: Reset Flow Pages** - UI pages for password reset
- [ ] **Phase 12: Welcome Email** - Welcome email triggered on registration

## Phase Details

### Phase 6: Database Schema

**Goal**: Password reset token storage infrastructure exists
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: RESET-11
**Success Criteria** (what must be TRUE):

1. `password_reset_tokens` table exists with `tokenHash`, `userId`, `expiresAt`, `usedAt` columns
2. Migration runs successfully on existing database
3. Table has foreign key constraint to `authUsers`
   **Plans**: 1 plan

Plans:

- [ ] 06-01: Create password_reset_tokens schema and migration

### Phase 7: SMTP Infrastructure

**Goal**: Application can send emails when SMTP is configured
**Depends on**: Phase 6
**Requirements**: SMTP-01, SMTP-02, SMTP-03, SMTP-04
**Success Criteria** (what must be TRUE):

1. Email can be sent via configured SMTP server
2. Application starts and runs without SMTP configured (no crashes)
3. Docker deployment forwards all SMTP environment variables
4. Reset links use correct APP_URL from environment
   **Plans**: 2 plans

Plans:

- [ ] 07-01: Create Nodemailer transporter with singleton pattern
- [ ] 07-02: Add SMTP environment variables to docker-compose.yml

### Phase 8: Email Templates

**Goal**: Professional branded emails are rendered correctly
**Depends on**: Phase 7
**Requirements**: TEMPLATES-01, TEMPLATES-02, TEMPLATES-03, TEMPLATES-04, TEMPLATES-05
**Success Criteria** (what must be TRUE):

1. Reset password email renders with Vault dark theme (dark background, amber accents)
2. Welcome email renders with Vault dark theme
3. All styles are inline (no external CSS or Tailwind classes)
4. Both emails include plaintext fallback
5. Reset email displays 1-hour expiry notice
   **Plans**: 2 plans

Plans:

- [ ] 08-01: Create Vault-branded reset password email template
- [ ] 08-02: Create Vault-branded welcome email template

### Phase 9: Token Security

**Goal**: Secure token lifecycle management works correctly
**Depends on**: Phase 6
**Requirements**: RESET-03, RESET-04, RESET-05, RESET-06, RESET-10
**Success Criteria** (what must be TRUE):

1. Tokens are 256-bit cryptographically random (crypto.randomBytes)
2. Tokens expire after 1 hour
3. Tokens can only be used once (marked used after consumption)
4. Raw tokens are never stored in database (SHA-256 hash only)
5. Successful password reset invalidates all other tokens for that user
   **Plans**: 2 plans

Plans:

- [ ] 09-01: Create token generation and hashing utilities
- [ ] 09-02: Create token lifecycle DB operations (create, validate, consume)

### Phase 10: Reset Flow Actions

**Goal**: Password reset backend logic works securely
**Depends on**: Phase 7, Phase 9
**Requirements**: RESET-01, RESET-07, RESET-08, RESET-09
**Success Criteria** (what must be TRUE):

1. User can request password reset by submitting email (if SMTP enabled)
2. Forgot-password returns identical response whether email exists or not
3. User can set new password with valid token
4. Invalid or expired tokens show clear error message
   **Plans**: 2 plans

Plans:

- [ ] 10-01: Create forgotPasswordAction server action
- [ ] 10-02: Create resetPasswordAction server action

### Phase 11: Reset Flow Pages

**Goal**: Users can navigate and complete the password reset flow
**Depends on**: Phase 10
**Requirements**: RESET-02
**Success Criteria** (what must be TRUE):

1. "Forgot password?" link is visible on login page
2. Forgot-password page accepts email and shows success message
3. Reset-password page accepts token and new password
4. Successful reset redirects to login page
   **Plans**: 3 plans

Plans:

- [ ] 11-01: Create forgot-password page with form
- [ ] 11-02: Create reset-password page with form
- [ ] 11-03: Add "Forgot password?" link to login page

### Phase 12: Welcome Email

**Goal**: New users receive welcome email after registration
**Depends on**: Phase 7, Phase 8
**Requirements**: WELCOME-01, WELCOME-02, WELCOME-03
**Success Criteria** (what must be TRUE):

1. Welcome email is sent after successful registration (if SMTP enabled)
2. Registration completes without waiting for email to send
3. Email send failure does not affect registration success
   **Plans**: 1 plan

Plans:

- [ ] 12-01: Integrate welcome email into registerAction

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8 → 9 → 10 → 11 → 12

| Phase                       | Milestone | Plans Complete | Status      | Completed  |
| --------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Core Auth Infrastructure | v1.0      | 3/3            | Complete    | 2026-02-24 |
| 2. Database Migration       | v1.0      | 4/4            | Complete    | 2026-02-24 |
| 3. Server Actions Refactor  | v1.0      | 5/5            | Complete    | 2026-02-24 |
| 4. Auth UI Components       | v1.0      | 4/4            | Complete    | 2026-02-24 |
| 5. Registration Mode Logic  | v1.0      | 2/2            | Complete    | 2026-02-25 |
| 6. Database Schema          | v1.1      | 0/1            | Not started | -          |
| 7. SMTP Infrastructure      | v1.1      | 0/2            | Not started | -          |
| 8. Email Templates          | v1.1      | 0/2            | Not started | -          |
| 9. Token Security           | v1.1      | 0/2            | Not started | -          |
| 10. Reset Flow Actions      | v1.1      | 0/2            | Not started | -          |
| 11. Reset Flow Pages        | v1.1      | 0/3            | Not started | -          |
| 12. Welcome Email           | v1.1      | 0/1            | Not started | -          |

---

_Roadmap created: 2026-02-24 | v1.0 shipped: 2026-02-25 | v1.1 roadmap: 2026-02-25_
