# Cashlytics Multi-User Auth

## What This Is

Cashlytics ist eine Self-Hosted Finanzverwaltungs-App mit Accounts, Expenses, Income, Transfers, Categories, Analytics und einem AI-Assistant. Ziel dieses Milestones: Multi-User-Fähigkeit mit sauberer Authentifizierung via Auth.js (ex-NextAuth).

## Core Value

Jeder User sieht nur seine eigenen Finanzdaten — sicher isoliert auf Database- und Middleware-Ebene.

## Requirements

### Validated

- ✓ Single-User Finanzverwaltung (accounts, expenses, income, transfers, categories)
- ✓ Dashboard mit Stats und Category-Breakdown
- ✓ Analytics mit Charts (Recharts)
- ✓ AI-Assistant für Finanzen (OpenAI + Tools)
- ✓ Document Management
- ✓ i18n (DE/EN)
- ✓ Dark/Light Theme
- ✓ Docker Deployment (Dockerfile, docker-compose)

### Active

- [ ] User können sich mit Email + Passwort registrieren/anmelden
- [ ] `.env` Variable steuert Registrierungs-Modus (offen vs. single-user)
- [ ] Bei Single-User-Modus: nur der per `.env` definierte User darf existieren
- [ ] Jeder User sieht nur seine eigenen Daten (Row-Level Isolation)
- [ ] Unauthentifizierte User kommen nicht an geschützte Routen (Middleware)
- [ ] Existierende Daten werden bei Migration dem User aus `.env` zugewiesen
- [ ] Alle DB-Tabellen erhalten `userId` Foreign Key
- [ ] Alle Server Actions filtern nach `userId`
- [ ] Migrations für Schema-Änderungen erstellt
- [ ] Seed-Daten (demo.sql) angepasst für Multi-User
- [ ] Dockerfile und docker-compose aktualisiert

### Out of Scope

- OAuth Provider (Google, GitHub) — kann später ergänzt werden
- Role-based Access Control (Admin/User) — alle User sind gleich
- Email Verification — Password-Reset via Email später
- Password Reset Flow — später
- Team/Organization Features — Single-Tenant pro Instanz

## Context

**Bestehende Architektur:**

- Next.js 16 App Router mit Server Actions
- Drizzle ORM + PostgreSQL
- Atomic Design Components (shadcn/ui basis)
- AI SDK für Chat-Assistant
- Keine Auth bisher (single-user/self-hosted assumption)

**Betroffene Tabellen:**

- `accounts` → `userId` FK
- `expenses` → `userId` FK
- `income` → `userId` FK
- `transfers` → `userId` FK
- `categories` → `userId` FK (oder global/shared?)
- `conversations` → `userId` FK
- `documents` → `userId` FK

**Neue Tabellen:**

- `users` (Auth.js adapter)
- `sessions` (Auth.js adapter)
- `verificationTokens` (Auth.js adapter)

## Constraints

- **Tech Stack:** Auth.js v5 (NextAuth) mit Drizzle Adapter
- **DB:** PostgreSQL, Migration via Drizzle Kit
- **Deployment:** Docker muss weiterhin funktionieren
- **Backward Compat:** `.env` Modus für Single-User muss bestehende UX erhalten

## Key Decisions

| Decision                        | Rationale                                         | Outcome   |
| ------------------------------- | ------------------------------------------------- | --------- |
| Auth.js statt Eigenbau          | Battle-tested, Sessions, CSRF Protection          | — Pending |
| `.env` für Registrierungs-Modus | Flexibilität für Self-Hosted vs. SaaS             | — Pending |
| Query-Level Isolation           | Jede Query filtert `userId`, nicht nur Middleware | — Pending |
| Categories per User             | Jeder User hat eigene Categories                  | — Pending |

---

_Last updated: 2026-02-24 after initialization_
