# Cashlytics Project Context (CSV Import Planning Baseline)

## 1) Product and Platform Snapshot

- Product: Personal finance app with accounts, expenses, income, transfers, analytics, and AI assistant.
- Runtime: Next.js 16 App Router + React 19 + TypeScript.
- Data layer: PostgreSQL + Drizzle ORM.
- Validation: Zod + React Hook Form.
- Localization: `next-intl` with German and English message bundles.
- AI: Vercel AI SDK (`ai`) with `@ai-sdk/openai`.

Primary references:

- `README.md`
- `package.json`
- `src/lib/db/schema.ts`

## 2) Existing Domain Model Relevant to Import

### Accounts

- `accounts` table stores user-scoped financial accounts and current balances.
- Import target mapping must resolve to exactly one user-owned account per uploaded file.

### Expenses and Income

- One-time expenses: `daily_expenses`.
- Recurring expenses: `expenses`.
- Income: `incomes`.

Current fit for CSV import:

- Negative amount rows should map to `daily_expenses`.
- Positive amount rows should map to `incomes` with `recurrenceType = once` for imported records.

Primary references:

- `src/lib/db/schema.ts`
- `src/actions/expense-actions.ts`
- `src/actions/income-actions.ts`

## 3) Existing UX Patterns to Reuse

- Dashboard route-group pages load server data and hydrate client components.
- Add/edit flows already rely on modal forms, toast feedback, and server action responses (`ApiResponse<T>`).
- Expense and income pages already support account-scoped filtering and edit/delete operations.

Primary references:

- `src/app/(dashboard)/expenses/page.tsx`
- `src/app/(dashboard)/expenses/client.tsx`
- `src/app/(dashboard)/income/page.tsx`
- `src/app/(dashboard)/income/client.tsx`

## 4) Existing AI Infrastructure to Reuse

- AI stack already includes prompt orchestration and tool-call patterns in chat route.
- Existing implementation has prompt sanitization and strict domain-scoped behavior.
- This can be mirrored for import reconciliation: structured model output with strict schema.

Primary references:

- `src/app/api/chat/route.ts`
- `src/lib/ai/tools.ts`

## 5) i18n Baseline and Multilingual Requirement

- Localization keys exist in `messages/de.json` and `messages/en.json`.
- New import flow must be fully localized in both languages.
- No hardcoded UI copy in new import components.

Primary references:

- `messages/de.json`
- `messages/en.json`

## 6) Current Gap Analysis for Requested Feature

- No dedicated CSV import area yet.
- No import staging data model (session/rows/conflicts/decisions).
- No existing duplicate reconciliation workflow between imported and manually entered entries.
- No explicit UI gating for AI-only features based on missing API key in navigation/FAB.

## 7) Sample CSV Analysis (Provided by User)

- Source file: `.local-dev/Konto 9035617202 - 2026-03-04 13.36.30.csv`
- Delimiter: `;`
- Decimal format: `,`
- Header language: Danish (for example `Bogforingsdato`, `Belob`, `Afsender`, `Modtager`)
- Includes running balance (`Saldo`) and currency (`Valuta`)

Integration impact:

- Import needs robust header mapping and locale-aware number/date normalization.
- Import logic must support generic templates and per-bank variants.

## 8) Generic CSV Header Contract (Target Canonical Schema)

Use this canonical header contract internally for all imported files:

1. `booking_date`
2. `amount`
3. `currency`
4. `description`
5. `counterparty`
6. `sender_account`
7. `receiver_account`
8. `balance_after_booking` (optional)
9. `reference` (optional)

Notes:

- Sign on `amount` defines direction (`< 0` expense, `> 0` income).
- `booking_date`, `amount`, and `currency` are mandatory for import.

## 9) Feature Constraints and Non-Negotiables

- Multi-language support is mandatory for all UI and errors.
- AI prompt must be authored in English.
- If no `OPENAI_API_KEY` exists, import option must not appear in UI and import endpoints must reject access.
- Final persistence must be transactional and user-scoped.

## 10) Recommended Delivery Artifacts

- `IMPLEMENTATION-PLAN.md`: phased plan with dependencies, scope, tests.
- `AI-RECONCILIATION-PROMPT.md`: production-grade English prompt + strict JSON schema.
- Optional: `csv-template.generic.csv` in `.local-dev/` as neutral import template example.
