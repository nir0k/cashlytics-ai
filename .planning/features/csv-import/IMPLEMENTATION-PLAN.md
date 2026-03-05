# Implementation Plan: CSV Import With AI Reconciliation

## Overview

Build a staged CSV import feature that maps file data to a selected account, classifies income/expense entries, runs AI-based duplicate reconciliation against manually entered records, lets users resolve conflicts, supports manual pre-commit cleanup, and finalizes via a transactional commit.

## Scope and Principles

- Multi-language first: all user-facing strings in `de` and `en` message bundles.
- Prompt in English: AI reconciliation prompt and schema instructions must be English.
- Safety first: no direct write on upload; always stage, review, then confirm.
- Deterministic reconciliation: structured JSON output from AI with strict validation.
- Feature gate: hide import feature if `OPENAI_API_KEY` is missing.

## Proposed Components

1. Import domain schema and persistence
2. CSV parsing and normalization service
3. Import API routes/server actions
4. Reconciliation engine (candidate search + AI scoring)
5. Conflict resolution and review UI
6. Final commit pipeline
7. i18n coverage and feature gating
8. Test and validation suite

## Phase Breakdown

### Phase 1: Data Model and Contracts

Goal: Define persistent staging model and strict typed contracts.

Tasks:

- Add import tables:
  - `import_sessions`
  - `import_rows`
  - `import_conflicts`
  - `import_decisions`
- Add enums and statuses:
  - Session: `draft | review | confirmed | cancelled`
  - Conflict suggestion: `keep_both | replace_existing | skip_import_row | needs_user_review`
  - Decision: `keep_both | replace_existing | skip_import_row`
- Add TypeScript types and result payloads in a dedicated import type module.

Dependencies: none
Verification:

- Schema compiles and migrates.
- Types can represent upload, preview, conflict, and commit states.

### Phase 2: CSV Ingestion and Normalization

Goal: Parse user CSV robustly into canonical import rows.

Tasks:

- Add parsing module to:
  - detect delimiter (semicolon/comma)
  - handle BOM
  - normalize decimal comma and decimal point
  - normalize date formats to ISO date
- Add header mapper:
  - map known bank headers (including provided sample) to canonical fields
  - support manual mapping fallback for unknown headers
- Validate each parsed row with Zod.
- Persist normalized rows as staged entries under `import_sessions`.

Dependencies: Phase 1
Verification:

- Sample file in `.local-dev/` parses without data loss.
- Invalid rows are reported clearly and localized.

### Phase 3: Candidate Matching and AI Reconciliation

Goal: Detect exact and near duplicates against manual entries.

Tasks:

- Build deterministic candidate retrieval from existing user data:
  - `daily_expenses` and `incomes`
  - filtered by selected account and bounded date window
  - amount-direction compatible candidates only
- Build reconciliation request payload and call AI with strict schema output.
- Validate model output with Zod before persistence.
- Persist conflict results in `import_conflicts` with score, confidence, and explanation.

Dependencies: Phase 2
Verification:

- Reconciliation returns schema-valid JSON.
- False positives reduced by deterministic pre-filter.

### Phase 4: Import UI (Upload -> Preview -> Resolve -> Review)

Goal: Deliver end-to-end import interaction.

Tasks:

- Add new dashboard route (for example `/import`) with:
  - file upload
  - account selector (required)
  - parsing result summary
  - conflict cards and decision controls
  - pre-commit editable table with row removal
- Add actions:
  - start session
  - upload/parse
  - run reconciliation
  - set decisions
  - remove staged rows
  - confirm import
- Ensure all labels, messages, and errors are localized in DE/EN.

Dependencies: Phase 3
Verification:

- User can complete workflow without raw JSON exposure.
- Every conflict requires explicit user decision before final confirmation.

### Phase 5: Transactional Commit Pipeline

Goal: Safely apply user-approved staged data into core tables.

Tasks:

- Commit in a single DB transaction:
  - apply decisions
  - insert approved new rows into `daily_expenses` / `incomes`
  - replace/update existing rows where user selected replace
  - mark session as confirmed
- Add idempotency guard for repeated confirm calls.
- Add audit metadata (`createdBy`, timestamps, session linkage).

Dependencies: Phase 4
Verification:

- Partial failures roll back entirely.
- Confirm endpoint is safe against double-submit.

### Phase 6: Feature Gating and Navigation Integration

Goal: Hide feature when AI is not configured.

Tasks:

- Create central helper `isAiEnabled` from `process.env.OPENAI_API_KEY`.
- Conditionally show import navigation and quick-access actions only when enabled.
- Protect import API/actions with explicit server-side checks.

Dependencies: Phase 4 (UI), Phase 5 (backend)
Verification:

- Without key: no import entry point visible, endpoints reject.
- With key: full feature available.

### Phase 7: Quality, Testing, and Rollout

Goal: Validate correctness and production safety.

Tasks:

- Unit tests:
  - parser
  - header mapping
  - normalization
  - reconciliation output validation
- Integration tests:
  - upload -> reconcile -> resolve -> commit
  - duplicate replacement path
  - keep-both path
  - skip path
- Manual QA matrix:
  - DE and EN flows
  - no API key flow
  - malformed CSV flow

Dependencies: all previous phases
Verification:

- End-to-end happy path and conflict path both pass.
- Localization complete with no missing keys.

## Canonical Mapping for Provided CSV Sample

Current sample headers can map as:

- `Bogforingsdato` -> `booking_date`
- `Belob` -> `amount`
- `Valuta` -> `currency`
- `Beskrivelse` -> `description`
- `Navn` -> `counterparty` (fallback when present)
- `Afsender` -> `sender_account`
- `Modtager` -> `receiver_account`
- `Saldo` -> `balance_after_booking`

## Risks and Mitigations

- Risk: AI false matches -> Mitigation: deterministic pre-filter + mandatory user decisions.
- Risk: locale parsing errors -> Mitigation: explicit decimal/date normalization tests.
- Risk: accidental duplicate commits -> Mitigation: idempotency token per import session.
- Risk: untranslated UI -> Mitigation: i18n key checklist in PR gate.

## Estimated Effort

- Complexity: High
- Estimated implementation effort: 3-5 working days (including tests and QA)

## Exit Criteria

- [ ] User can import CSV and bind it to one selected account
- [ ] Income/expense direction correctly derived and persisted
- [ ] Similarity conflict workflow is AI-assisted and user-controlled
- [ ] Pre-commit row removal/edit is available
- [ ] Feature hidden when AI key is missing
- [ ] Full DE/EN localization coverage
