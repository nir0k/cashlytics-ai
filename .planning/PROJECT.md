# Cashlytics

## What This Is

Cashlytics ist eine Self-Hosted Finanzverwaltungs-App mit Accounts, Expenses, Income, Transfers, Categories, Analytics und einem AI-Assistant. Die App unterstützt Multi-User-Betrieb mit vollständiger Datenisolation pro User — via Auth.js v5, Row-Level Isolation in allen Server Actions, und konfigurierbarem Registrierungsmodus für Self-Hosted Deployments.

## Core Value

Jeder User sieht nur seine eigenen Finanzdaten — sicher isoliert auf Database- und Middleware-Ebene.

## Requirements

### Validated

- ✓ Single-User Finanzverwaltung (accounts, expenses, income, transfers, categories) — pre-v1.0
- ✓ Dashboard mit Stats und Category-Breakdown — pre-v1.0
- ✓ Analytics mit Charts (Recharts) — pre-v1.0
- ✓ AI-Assistant für Finanzen (OpenAI + Tools) — pre-v1.0
- ✓ Document Management — pre-v1.0
- ✓ i18n (DE/EN) — pre-v1.0
- ✓ Dark/Light Theme — pre-v1.0
- ✓ Docker Deployment (Dockerfile, docker-compose) — pre-v1.0
- ✓ User können sich mit Email + Passwort registrieren/anmelden — v1.0
- ✓ `.env` Variable steuert Registrierungs-Modus (SINGLE_USER_MODE) — v1.0
- ✓ Bei SINGLE_USER_MODE=true: Registrierung nach erstem User gesperrt — v1.0
- ✓ Jeder User sieht nur seine eigenen Daten (Row-Level Isolation) — v1.0
- ✓ Unauthentifizierte User kommen nicht an geschützte Routen (proxy.ts) — v1.0
- ✓ Existierende Daten werden bei Migration dem User aus `.env` zugewiesen — v1.0
- ✓ Alle 8 DB-Tabellen haben `userId` Foreign Key (NOT NULL) — v1.0
- ✓ Alle Server Actions filtern nach `userId` + FK-Validierung — v1.0
- ✓ Drizzle Migrations für alle Schema-Änderungen — v1.0
- ✓ Seed-Daten (seed-demo.sql) angepasst für Multi-User — v1.0
- ✓ Dockerfile und docker-compose weiterhin funktional — v1.0

### Active

<!-- v1.1 Email & Password Reset -->

- [ ] User kann SMTP-Einstellungen via `.env` konfigurieren (HOST, PORT, USER, PASS, FROM)
- [ ] User kann Password-Reset per Email anfordern (Forgot-Password-Flow)
- [ ] User kann Passwort via Token-Link aus Email zurücksetzen
- [ ] Reset-Tokens haben Ablaufzeit und können nur einmal verwendet werden
- [ ] User erhält Welcome-Mail nach erfolgreicher Registrierung
- [ ] Mails werden als HTML im Vault-Design (dark, amber) verschickt

### Out of Scope

- OAuth Provider (Google, GitHub) — kann später ergänzt werden
- Role-based Access Control (Admin/User) — alle User sind gleich
- Email Verification bei Registrierung — nicht in v1.1 geplant
- Team/Organization Features — Single-Tenant pro Instanz
- 2FA / TOTP — v2 backlog

## Current Milestone: v1.1 Email & Password Reset

**Goal:** SMTP-Infrastruktur und vollständiger Password-Reset-Flow via tokenbasierter Email

**Target features:**

- Nodemailer SMTP-Integration (konfigurierbar via `.env`)
- Forgot-Password-Seite + Server Action (Token generieren, Mail versenden)
- Reset-Password-Seite + Server Action (Token validieren, Passwort aktualisieren)
- Reset-Token-Tabelle in DB (token, userId, expiresAt, usedAt)
- Welcome-Mail bei Registrierung
- HTML-Email-Templates im Vault-Design

## Context

**Codebase State (v1.0):**

- ~18.6k LOC TypeScript (src/)
- Next.js 16 App Router + Turbopack (dev), Drizzle ORM + PostgreSQL
- Auth.js v5 (next-auth@5.0.0-beta.30) mit Drizzle Adapter + JWT Sessions
- `src/proxy.ts` für Edge-kompatible Route Protection (Node.js runtime, Next.js 16)
- `requireAuth()` utility in allen Server Actions, `auth()` direkt in Route Handlers
- `src/lib/auth/registration-mode.ts` für SINGLE_USER_MODE Logik

**Known Issues / Tech Debt:**

- `next dev --webpack` war als Workaround nötig (Turbopack PostCSS Crash) — Turbopack stabilisiert sich, aktuell wieder funktional
- Auth.js befindet sich noch in Beta (v5.0.0-beta.30) — bei Major Release ggf. Breaking Changes

## Constraints

- **Tech Stack:** Auth.js v5 (NextAuth) mit Drizzle Adapter
- **DB:** PostgreSQL, Migration via Drizzle Kit
- **Deployment:** Docker muss weiterhin funktionieren
- **Session:** JWT (nicht Database Sessions) — Edge-kompatibel für proxy.ts

## Key Decisions

| Decision                             | Rationale                                               | Outcome    |
| ------------------------------------ | ------------------------------------------------------- | ---------- |
| Auth.js statt Eigenbau               | Battle-tested, Sessions, CSRF Protection                | ✓ Gut      |
| JWT Sessions (nicht DB Sessions)     | Edge-kompatibel für proxy.ts (Next.js 16)               | ✓ Gut      |
| `.env` SINGLE_USER_MODE              | Flexibilität Self-Hosted vs. SaaS, kein DB-Lookup nötig | ✓ Gut      |
| Query-Level Isolation                | Jede Query filtert `userId`, nicht nur Middleware       | ✓ Gut      |
| Categories per User                  | Jeder User hat eigene Categories                        | ✓ Gut      |
| bcrypt@6.0.0 (Pure JS)               | Docker-friendly, keine native Kompilierung              | ✓ Gut      |
| auth\_ Prefix für Auth.js Tabellen   | Verhindert Namenskonflikt mit eigenem `accounts` Table  | ✓ Gut      |
| `src/proxy.ts` statt Root `proxy.ts` | Watchpack watched nur `src/` wenn App in `src/app`      | ✓ Kritisch |
| `secureCookie` dynamisch via Header  | `__Secure-` Cookie Prefix bei HTTPS korrekt gelesen     | ✓ Gut      |
| `count(*)::int` Cast in Drizzle      | Drizzle gibt ohne Cast String zurück — Bug Prevention   | ✓ Gut      |

---

_Last updated: 2026-02-25 after v1.1 milestone start_
