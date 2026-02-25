---
phase: 04-auth-ui-components
plan: "02"
subsystem: auth
tags: [next-auth, react, useActionState, useFormStatus, next-image, glass-ui, tailwind]

# Dependency graph
requires:
  - phase: 04-01
    provides: loginAction and AuthActionState from auth-actions.ts
  - phase: 01-core-auth-infrastructure
    provides: Auth.js credentials provider, signIn/signOut
provides:
  - (auth) route group layout with Vault split-panel branding design
  - /login page server component rendering LoginForm
  - LoginForm client component with useActionState + useFormStatus pattern
affects: [04-03, 04-04, 05-registration-mode-logic]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useActionState from 'react' (React 19 / Next.js 15) — NOT from 'react-dom'"
    - "useFormStatus from 'react-dom' — must be in child component rendered inside <form>"
    - "SubmitButton extracted as separate component so useFormStatus can read parent form pending state"
    - "(auth) route group isolates auth pages from dashboard sidebar/header layout"

key-files:
  created:
    - src/app/(auth)/layout.tsx
    - src/app/(auth)/login/page.tsx
    - src/components/organisms/login-form.tsx

key-decisions:
  - "SubmitButton extracted as separate component — useFormStatus must be used inside a component rendered within <form>"
  - "(auth) route group layout does not inherit dashboard layout — sidebar and header are absent at /login"
  - "brightness-0 invert on left panel logo — inverts dark logo SVG for display on dark (#08080a) background"
  - "dark:brightness-0 dark:invert on right panel logo — only inverts in dark mode to preserve light mode display"

patterns-established:
  - "Auth layout pattern: full-screen flex split with hidden lg:flex branding left + flex-1 form right"
  - "Form error display: state.error for global errors, state.fieldErrors?.field for per-field inline errors"

requirements-completed: [AUTH-02, AUTH-06]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 4 Plan 02: Login Page and Auth Layout Summary

**Vault split-panel auth layout at (auth)/layout.tsx + /login page with LoginForm using useActionState wired to loginAction**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-24T19:52:08Z
- **Completed:** 2026-02-24T19:54:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- (auth) route group layout with dark branding left panel (vault-grid, amber blobs, logo + tagline) and form-centering right panel
- /login page server component wrapping LoginForm, isolated from dashboard sidebar/header
- LoginForm client component with useActionState + SubmitButton (useFormStatus) pattern, glass-elevated card, amber submit button with spinner, field/global error display, link to /register

## Task Commits

Each task was committed atomically:

1. **Task 1: Create (auth) route group layout with split-panel design** - `11de150` (feat)
2. **Task 2: Create login page and LoginForm client component** - `86b6c19` (feat)

## Files Created/Modified

- `src/app/(auth)/layout.tsx` - Full-screen split auth layout: dark Vault branding left panel (hidden on mobile, lg+ visible) + form right panel; no sidebar/header
- `src/app/(auth)/login/page.tsx` - Thin server component rendering LoginForm at /login route
- `src/components/organisms/login-form.tsx` - Client component with useActionState(loginAction), SubmitButton(useFormStatus), glass-elevated card, email/password fields, inline error display, amber CTA, register link

## Decisions Made

- SubmitButton extracted as its own component so `useFormStatus` can read the parent `<form>` pending state — if inlined into LoginForm directly, useFormStatus does not detect the correct form
- `(auth)` route group layout is completely separate from the dashboard layout — navigating to /login shows no sidebar, no header
- Left panel logo uses `brightness-0 invert` Tailwind filter — the logo SVG is dark on light; this inverts it for the dark (#08080a) panel
- Right panel logo uses `dark:brightness-0 dark:invert` — conditionally inverts only in dark mode

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- /login route is fully functional: renders LoginForm inside auth layout, wired to loginAction
- Plan 04-03 (register page) can import from the same pattern: use RegisterForm with registerAction
- Plan 04-04 (logout button) already complete in prior session
- No blockers

---

_Phase: 04-auth-ui-components_
_Completed: 2026-02-24_

## Self-Check: PASSED

- FOUND: src/app/(auth)/layout.tsx
- FOUND: src/app/(auth)/login/page.tsx
- FOUND: src/components/organisms/login-form.tsx
- FOUND: 04-02-SUMMARY.md
- FOUND commit: 11de150 (Task 1)
- FOUND commit: 86b6c19 (Task 2)
