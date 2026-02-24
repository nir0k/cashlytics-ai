# Requirements: Cashlytics Multi-User Auth

**Defined:** 2026-02-24
**Core Value:** Jeder User sieht nur seine eigenen Finanzdaten — sicher isoliert auf Database- und Middleware-Ebene.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User kann sich mit Email und Passwort registrieren
- [ ] **AUTH-02**: User kann sich mit Email und Passwort einloggen
- [x] **AUTH-03**: User bleibt über Browser-Refresh eingeloggt (Session Persistenz)
- [ ] **AUTH-04**: User kann sich ausloggen
- [x] **AUTH-05**: Passwörter werden mit bcrypt gehasht gespeichert
- [ ] **AUTH-06**: Login-Seite ist unter /login erreichbar
- [ ] **AUTH-07**: Registrierungs-Seite ist unter /register erreichbar

### Authorization

- [x] **AUTHZ-01**: Unauthentifizierte User werden von geschützten Routen zu /login redirected
- [x] **AUTHZ-02**: Server Actions verifizieren Session vor jeder Mutation
- [x] **AUTHZ-03**: Server Actions verifizieren Session vor jedem Lesezugriff

### Data Isolation

- [x] **DATA-01**: Alle Queries filtern nach userId aus Session
- [x] **DATA-02**: accounts Tabelle hat userId Foreign Key
- [x] **DATA-03**: expenses Tabelle hat userId Foreign Key
- [x] **DATA-04**: income Tabelle hat userId Foreign Key
- [x] **DATA-05**: daily_expenses Tabelle hat userId Foreign Key
- [x] **DATA-06**: transfers Tabelle hat userId Foreign Key
- [x] **DATA-07**: categories Tabelle hat userId Foreign Key
- [x] **DATA-08**: documents Tabelle hat userId Foreign Key
- [x] **DATA-09**: conversations Tabelle hat userId Foreign Key
- [ ] **DATA-10**: FK-Validierung: User kann nur eigene Accounts/Categories in Queries nutzen

### Registration Mode

- [ ] **MODE-01**: SINGLE_USER_MODE in .env steuert Registrierungs-Verhalten
- [ ] **MODE-02**: SINGLE_USER_EMAIL in .env definiert den Single-User
- [ ] **MODE-03**: Bei SINGLE_USER_MODE=true ist Registrierung deaktiviert nach erstem User
- [ ] **MODE-04**: Bei SINGLE_USER_MODE=false kann sich jeder registrieren

### Migration

- [x] **MIG-01**: Drizzle Migration für Auth.js Tabellen (users, accounts, sessions, verificationTokens)
- [x] **MIG-02**: Drizzle Migration für userId FK auf allen existierenden Tabellen
- [ ] **MIG-03**: Migration Script weist existierende Daten SINGLE_USER_EMAIL zu
- [x] **MIG-04**: seed-demo.sql wird mit userId angepasst

### Infrastructure

- [x] **INFRA-01**: Auth.js v5 mit Drizzle Adapter konfiguriert
- [x] **INFRA-02**: proxy.ts (Next.js 16) für Route Protection
- [x] **INFRA-03**: /api/auth/[...nextauth] Route Handler
- [ ] **INFRA-04**: SessionProvider im Root Layout
- [x] **INFRA-05**: TypeScript Types für erweiterte Session (user.id)
- [x] **INFRA-06**: Dockerfile angepasst (keine Änderungen nötig, nur Verification)
- [x] **INFRA-07**: docker-compose.yml angepasst (keine Änderungen nötig, nur Verification)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Auth

- **AUTH-2FA-01**: User kann 2FA mit TOTP aktivieren
- **AUTH-2FA-02**: User muss 2FA Code bei Login eingeben wenn aktiviert
- **AUTH-RESET-01**: User kann Passwort via Email-Link zurücksetzen
- **AUTH-RATE-01**: Login Versuche sind per IP rate-limited

### Enhanced UX

- **UX-01**: User kann eigene Sessions sehen und revoken
- **UX-02**: "Remember Me" verlängert Session

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                         | Reason                                         |
| ------------------------------- | ---------------------------------------------- |
| OAuth Provider (Google, GitHub) | Kann später ergänzt werden, nicht MVP-kritisch |
| Role-based Access Control       | Alle User sind gleich, kein Admin/User-System  |
| Email Verification              | Password-Reset via Email später                |
| Team/Organization Features      | Single-Tenant pro Instanz                      |
| Magic Link Login                | Email Service Dependency, später               |
| Passkeys/WebAuthn               | Cutting Edge, niedrige Adaption                |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase   | Status    |
| ----------- | ------- | --------- |
| AUTH-01     | Phase 4 | Pending   |
| AUTH-02     | Phase 4 | Pending   |
| AUTH-03     | Phase 1 | Complete  |
| AUTH-04     | Phase 4 | Pending   |
| AUTH-05     | Phase 1 | Completed |
| AUTH-06     | Phase 4 | Pending   |
| AUTH-07     | Phase 4 | Pending   |
| AUTHZ-01    | Phase 1 | Complete  |
| AUTHZ-02    | Phase 3 | Complete  |
| AUTHZ-03    | Phase 3 | Complete  |
| DATA-01     | Phase 3 | Complete  |
| DATA-02     | Phase 2 | Complete  |
| DATA-03     | Phase 2 | Complete  |
| DATA-04     | Phase 2 | Complete  |
| DATA-05     | Phase 2 | Complete  |
| DATA-06     | Phase 2 | Complete  |
| DATA-07     | Phase 2 | Complete  |
| DATA-08     | Phase 2 | Complete  |
| DATA-09     | Phase 2 | Complete  |
| DATA-10     | Phase 3 | Pending   |
| MODE-01     | Phase 5 | Pending   |
| MODE-02     | Phase 5 | Pending   |
| MODE-03     | Phase 5 | Pending   |
| MODE-04     | Phase 5 | Pending   |
| MIG-01      | Phase 2 | Complete  |
| MIG-02      | Phase 2 | Complete  |
| MIG-03      | Phase 2 | Pending   |
| MIG-04      | Phase 2 | Complete  |
| INFRA-01    | Phase 1 | Completed |
| INFRA-02    | Phase 1 | Complete  |
| INFRA-03    | Phase 1 | Completed |
| INFRA-04    | Phase 4 | Pending   |
| INFRA-05    | Phase 1 | Completed |
| INFRA-06    | Phase 1 | Complete  |
| INFRA-07    | Phase 1 | Complete  |

**Coverage:**

- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0 ✓

---

_Requirements defined: 2026-02-24_
_Last updated: 2026-02-24 after initial definition_
