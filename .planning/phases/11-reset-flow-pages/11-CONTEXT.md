# Phase 11: Reset Flow Pages - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

UI pages for password reset flow: forgot-password page (email input), reset-password page (token validation + new password), and "Forgot password?" link on login page. Users navigate through these pages to complete password reset.

</domain>

<decisions>
## Implementation Decisions

### Page layout & styling

- Match existing login/register page style exactly — centered card layout
- Same form width as login page for consistency
- Full dark/light theme support with theme toggle
- Match login page decorative elements (background, visual treatment)

### Form feedback

- Inline validation errors below each field (not toast)
- On forgot-password success: redirect to login page (no in-page success state)
- Loading state: submit button shows spinner and becomes disabled
- Standard form validation patterns from existing auth pages

### Token error handling

- Show error directly on reset-password page (don't redirect away)
- Unified error message: "This reset link is invalid or has expired" — no distinction between invalid/expired/used
- Provide link to forgot-password page for recovery action
- No auto-send new token — user must request again manually

### Post-reset flow

- Redirect to login page after successful password reset
- Toast notification on login page: "Password reset successful, please log in"
- Auto-fill email on login page via URL param (e.g., `?email=user@example.com`)
- Clear reset token from URL after processing

### Claude's Discretion

- Exact toast implementation (position, duration, styling)
- Email validation regex/pattern (match existing)
- Password strength requirements display (match register page)
- Error message styling and iconography

</decisions>

<specifics>
## Specific Ideas

- Consistency with existing auth pages is paramount — these should feel like part of the same system
- User should never feel "stuck" — always a clear path forward (link to forgot-password, redirect to login)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 11-reset-flow-pages_
_Context gathered: 2026-02-25_
