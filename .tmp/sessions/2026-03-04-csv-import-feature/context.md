# Task Context: CSV Import With AI Conflict Resolution

Session ID: 2026-03-04-csv-import-feature
Created: 2026-03-04T00:00:00Z
Status: in_progress

## Current Request

Create a detailed, documented project overview and a clean implementation plan for a new complex feature: users can import financial data via CSV, map imports to one of their accounts, detect duplicate/similar entries against manually entered income/expense records using AI, let users decide conflict outcomes, allow manual row cleanup before final confirmation, and hide the import feature when no AI API key is configured.

## Context Files (Standards to Follow)

- /home/coder/.opencode/context/core/standards/code-quality.md
- /home/coder/.opencode/context/core/workflows/feature-breakdown.md
- /home/coder/.opencode/context/core/workflows/task-delegation-basics.md
- /home/coder/.opencode/context/core/workflows/component-planning.md
- /home/coder/.opencode/context/openagents-repo/guides/external-libraries-workflow.md
- /home/coder/.opencode/context/core/workflows/external-context-integration.md

## Reference Files (Source Material to Look At)

- /home/coder/cashlytics/README.md
- /home/coder/cashlytics/package.json
- /home/coder/cashlytics/src/lib/db/schema.ts
- /home/coder/cashlytics/src/types/database.ts
- /home/coder/cashlytics/src/actions/expense-actions.ts
- /home/coder/cashlytics/src/actions/income-actions.ts
- /home/coder/cashlytics/src/actions/account-actions.ts
- /home/coder/cashlytics/src/lib/validations/transaction.ts
- /home/coder/cashlytics/src/app/(dashboard)/expenses/client.tsx
- /home/coder/cashlytics/src/app/(dashboard)/income/client.tsx
- /home/coder/cashlytics/src/components/layout/app-sidebar.tsx
- /home/coder/cashlytics/src/components/organisms/floating-actions.tsx
- /home/coder/cashlytics/src/app/api/chat/route.ts
- /home/coder/cashlytics/src/lib/ai/tools.ts
- /home/coder/cashlytics/messages/de.json
- /home/coder/cashlytics/messages/en.json
- /home/coder/cashlytics/.local-dev/Konto 9035617202 - 2026-03-04 13.36.30.csv

## External Docs Fetched

- .tmp/external-context/next.js/nextjs-16-route-handlers-server-actions.md
  - Next.js 16 route handlers and FormData upload patterns
- .tmp/external-context/vercel-ai/ai-sdk-v6-openai-structured-json.md
  - Vercel AI SDK v6 structured output and deterministic prompting
- .tmp/external-context/drizzle-orm/postgres-transactions-upserts-import-pipelines.md
  - Drizzle transaction, upsert, and import pipeline guidance
- .tmp/external-context/csv-node-nextjs/csv-parsing-node-nextjs-recommended-approach.md
  - CSV parsing patterns and file size/streaming safeguards

## Components

- Import Entry UI: Upload, account selection, and CSV mapping experience
- Import Processing API: Parse, normalize, validate, and stage rows
- AI Reconciliation Engine: Detect exact and near duplicates against manual records
- Conflict Resolution UI: User decision flow (replace, keep both, skip)
- Review Mode: Manual row removal/edit before final import confirmation
- Commit Engine: Transactional write of approved rows and conflict decisions
- Feature Gating: Hide import feature when AI key is not configured
- i18n Integration: Full de/en labels, errors, and workflow messaging

## Constraints

- Must preserve existing architecture: Next.js App Router + server actions + Drizzle
- Must keep user data isolation (all read/write filtered by authenticated user)
- Must support existing manual expense/income creation patterns
- Must support multilingual UI (German and English)
- AI prompt content must be authored in English
- Import option must be hidden when OPENAI_API_KEY is absent
- Final import commit must be transactional

## Exit Criteria

- [ ] Project overview document is complete and actionable
- [ ] Feature implementation plan is phased, dependency-aware, and testable
- [ ] AI reconciliation prompt is documented in English with strict output schema
- [ ] CSV generic header template is documented
- [ ] Multilingual requirements are explicitly covered
- [ ] Missing API key behavior is explicitly covered
