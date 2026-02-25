---
phase: 05-registration-mode-logic
verified: 2026-02-25T09:00:00Z
status: human_needed
score: 7/7 must-haves verified
re_verification: false
human_verification:
  - test: "Set SINGLE_USER_MODE=true in .env with one user in DB, then visit /register"
    expected: "Immediate redirect to /login — form never renders"
    why_human: "next/navigation redirect() behavior requires a running server to observe"
  - test: "Set SINGLE_USER_MODE=false in .env, visit /register"
    expected: "RegisterForm renders normally"
    why_human: "Requires live server and browser to confirm form renders"
  - test: "Set SINGLE_USER_MODE=true with empty users table, visit /register"
    expected: "RegisterForm renders — first user is allowed"
    why_human: "Requires live server with a clean database state to confirm count === 0 path"
  - test: "Submit the register form while SINGLE_USER_MODE=true and a user exists (bypass page guard via direct POST)"
    expected: "registerAction returns { error: 'Registration is disabled. This instance is configured for a single user.' }"
    why_human: "Server Action error state display in RegisterForm requires browser rendering to verify"
---

# Phase 5: Registration Mode Logic Verification Report

**Phase Goal:** Registration behavior is controlled by environment configuration
**Verified:** 2026-02-25T09:00:00Z
**Status:** human_needed (all automated checks pass — 4 live-server scenarios require human confirmation)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                               | Status          | Evidence                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | SINGLE_USER_MODE=true blocks all new registrations once a user exists               | VERIFIED        | `isRegistrationOpen()` returns `false` when `process.env.SINGLE_USER_MODE === "true"` and `count > 0`; `registerAction` returns error before Zod parse        |
| 2   | SINGLE_USER_MODE=false (or unset) allows registration for any visitor               | VERIFIED        | `if (!singleUserMode) return true;` — strict `=== "true"` check; anything else, including unset or "false", returns `true` immediately                        |
| 3   | registerAction returns a global error state when registration is blocked            | VERIFIED        | Lines 50–54 of `src/actions/auth-actions.ts`: `return { error: "Registration is disabled. This instance is configured for a single user." }`                  |
| 4   | Drizzle COUNT uses ::int cast so numeric comparison is always correct               | VERIFIED        | `sql<number>\`count(\*)::int\``at line 18 of`registration-mode.ts`; return type is `number`, compared with `=== 0`                                            |
| 5   | Visiting /register when SINGLE_USER_MODE=true and a user exists redirects to /login | VERIFIED (code) | `register/page.tsx` is async Server Component; calls `isRegistrationOpen()` and `redirect("/login")` before rendering; HUMAN still required for live behavior |
| 6   | Visiting /register when registration is open renders RegisterForm as before         | VERIFIED (code) | `if (!open) redirect(...)` — falls through to `return <RegisterForm />`; HUMAN required for live confirmation                                                 |
| 7   | .env.example documents SINGLE_USER_MODE and SINGLE_USER_EMAIL with comments         | VERIFIED        | "Registration Mode" section at lines 45–64 of `.env.example`; both vars documented with all three behavioral states explained                                 |

**Score:** 7/7 truths verified in code (4 truths require live-server human confirmation for full end-to-end certainty)

---

### Required Artifacts

| Artifact                            | Expected                                                                     | Status   | Details                                                                                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/auth/registration-mode.ts` | isRegistrationOpen() utility — reads env + queries user count                | VERIFIED | Exists, 21 lines, non-stub: exports `isRegistrationOpen`, uses `sql<number>\`count(\*)::int\``, strict `=== "true"` comparison, no "use server" directive |
| `src/actions/auth-actions.ts`       | registerAction with SINGLE_USER_MODE guard at top of function                | VERIFIED | Guard at lines 48–55, fires before Zod parse (line 57), imports `isRegistrationOpen` at line 11                                                           |
| `src/app/(auth)/register/page.tsx`  | Async Server Component with isRegistrationOpen() check before rendering form | VERIFIED | 11-line async Server Component; calls `isRegistrationOpen()` at line 6, `redirect("/login")` at line 8, outside any try/catch                             |
| `.env.example`                      | Documented SINGLE_USER_MODE and SINGLE_USER_EMAIL env vars                   | VERIFIED | "Registration Mode" section with `SINGLE_USER_MODE=true` (default) and `SINGLE_USER_EMAIL=you@example.com`, full operator-facing commentary               |

---

### Key Link Verification

| From                                | To                                  | Via                                 | Status | Details                                                                                                       |
| ----------------------------------- | ----------------------------------- | ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `src/actions/auth-actions.ts`       | `src/lib/auth/registration-mode.ts` | `import isRegistrationOpen`         | WIRED  | Line 11: `import { isRegistrationOpen } from "@/lib/auth/registration-mode"` — called at line 49              |
| `src/lib/auth/registration-mode.ts` | `db.users`                          | Drizzle COUNT query                 | WIRED  | Line 18: `db.select({ count: sql<number>\`count(\*)::int\` }).from(users)` — result destructured and returned |
| `src/app/(auth)/register/page.tsx`  | `src/lib/auth/registration-mode.ts` | `import isRegistrationOpen`         | WIRED  | Line 2: `import { isRegistrationOpen } from "@/lib/auth/registration-mode"` — called at line 6                |
| `src/app/(auth)/register/page.tsx`  | `/login`                            | `redirect()` from `next/navigation` | WIRED  | Line 1: `import { redirect } from "next/navigation"` — `redirect("/login")` at line 8 when `!open`            |

---

### Requirements Coverage

| Requirement | Source Plan                     | Description                                                              | Status    | Evidence                                                                                                                                                                   |
| ----------- | ------------------------------- | ------------------------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MODE-01     | 05-01, 05-02                    | SINGLE_USER_MODE in .env steuert Registrierungs-Verhalten                | SATISFIED | Env var read in `registration-mode.ts` line 15; wired into both `registerAction` (05-01) and `/register` page (05-02)                                                      |
| MODE-02     | 05-01 (SUMMARY claims coverage) | SINGLE_USER_EMAIL in .env definiert den Single-User                      | SATISFIED | `SINGLE_USER_EMAIL` documented in `.env.example` lines 61–64 with comment "Not used as a registration whitelist"; intentionally excluded from code logic per plan decision |
| MODE-03     | 05-01, 05-02                    | Bei SINGLE_USER_MODE=true ist Registrierung deaktiviert nach erstem User | SATISFIED | `count === 0` check in `isRegistrationOpen()` returns `false` when any user exists; both action guard and page redirect enforce this                                       |
| MODE-04     | 05-01                           | Bei SINGLE_USER_MODE=false kann sich jeder registrieren                  | SATISFIED | `if (!singleUserMode) return true` — any value other than the string `"true"` allows open registration                                                                     |

No orphaned requirements. All four MODE-0x IDs are assigned to Phase 5 in REQUIREMENTS.md and covered by plans 05-01 and 05-02.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact     |
| ---- | ---- | ------- | -------- | ---------- |
| —    | —    | —       | —        | None found |

Scan for TODO, FIXME, XXX, HACK, PLACEHOLDER, console.log, `return null`, `return {}`, `return []` across all three implementation files: zero hits.

---

### Commit Verification

All four task commits referenced in SUMMARY files exist and are valid:

| Commit    | Task         | Description                                                                   |
| --------- | ------------ | ----------------------------------------------------------------------------- |
| `ec5d207` | 05-01 Task 1 | feat(05-01): create isRegistrationOpen() utility                              |
| `c280689` | 05-01 Task 2 | feat(05-01): add SINGLE_USER_MODE guard to registerAction                     |
| `baf04df` | 05-02 Task 1 | feat(05-02): add server-side redirect to register page                        |
| `5f0fc64` | 05-02 Task 2 | chore(05-02): document SINGLE_USER_MODE and SINGLE_USER_EMAIL in .env.example |

---

### Human Verification Required

All four items are end-to-end behavioral scenarios that require a running dev server and database.

#### 1. Closed Mode — Page Redirect

**Test:** Set `SINGLE_USER_MODE=true` in `.env`, ensure at least one user row in DB, start dev server, visit `http://localhost:3000/register` without being logged in.
**Expected:** Immediate redirect to `http://localhost:3000/login` — the RegisterForm never renders.
**Why human:** `redirect()` from `next/navigation` throws `NEXT_REDIRECT` internally; only observable via browser navigation.

#### 2. Open Mode — Form Renders

**Test:** Set `SINGLE_USER_MODE=false` in `.env` (or remove the var), restart dev server, visit `http://localhost:3000/register`.
**Expected:** RegisterForm renders with email, password, confirmPassword fields visible.
**Why human:** Requires running server and browser; JSX rendering is not statically observable.

#### 3. First-User Flow in Single-User Mode

**Test:** Set `SINGLE_USER_MODE=true`, truncate the users table so it is empty, visit `http://localhost:3000/register`.
**Expected:** RegisterForm renders — the first user is permitted.
**Why human:** Requires controlled database state (empty users table) and a running server.

#### 4. Action-Level Guard (bypass page redirect)

**Test:** While `SINGLE_USER_MODE=true` and a user exists, submit the register form (or POST directly to the registerAction via a test form that bypasses the page redirect).
**Expected:** Form renders error: "Registration is disabled. This instance is configured for a single user." above the form.
**Why human:** Server Action error state display requires `useFormState`/`useActionState` rendering to be confirmed in the browser UI.

---

### Gaps Summary

None — no automated gaps. All code-level truths verified: utility exists and is substantive, action guard is wired and fires before Zod, page-level redirect is correctly placed outside try/catch, `.env.example` documents both vars with accurate operator guidance, all four MODE-0x requirements are satisfied, TypeScript compiles with zero errors, all four commits are present in git history.

Status is `human_needed` because the three SINGLE_USER_MODE behavioral scenarios (closed/open/first-user) and the action error state UI all require live-server confirmation. The code path is complete and correct; this is observational verification only.

---

_Verified: 2026-02-25T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
