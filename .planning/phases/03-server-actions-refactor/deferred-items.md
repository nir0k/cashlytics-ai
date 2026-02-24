# Deferred Items - Phase 03-05

## Pre-existing TypeScript Error (Out of Scope)

**File:** `src/lib/actions/account-actions.ts`
**Error:** TypeScript error on line 63 - `userId` property missing in `createAccount` function
**Discovery:** Found during Task 1 verification (`npx tsc --noEmit`)
**Status:** Not fixed - out of scope

**Reason for deferral:**

- Pre-existing error from previous phase, not caused by 03-05 changes
- File is in `src/lib/actions/` directory (different from `src/actions/` being modified)
- No imports from `@/lib/actions` found in codebase - appears to be unused legacy code
- Per deviation rules: "Pre-existing warnings, linting errors, or failures in unrelated files are out of scope"

**Recommendation:** Consider removing `src/lib/actions/` directory if truly unused, or add userId to createAccount if needed.
