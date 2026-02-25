# Phase 4: Auth UI Components - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Build login page, register page, logout functionality, and SessionProvider wiring. Users get a complete UI flow to authenticate. This covers only the auth UI — no profile editing, password reset, or email verification (separate phases if needed).

</domain>

<decisions>
## Implementation Decisions

### Page layout & visual style

- Split layout: left panel with branding/tagline, right panel with the form
- Full Vault aesthetic: glass card, amber accents, Syne headings — consistent with dashboard
- Logo mark + "Cashlytics" text displayed above the form on auth pages
- Login and register share the same card style with a "Don't have an account? Register" link below the form

### Registration form fields

- Fields: email + password + password confirmation (3 fields)
- Password confirmation field required ("confirm your password")
- Password requirements: minimum 8 characters + at least one number
- No Terms of Service checkbox — keep it simple

### Form UX & error handling

- Errors appear inline below each field
- Wrong login credentials: generic message "Invalid email or password" (security best practice — don't reveal which field is wrong)
- Duplicate email on register: specific message "An account with this email already exists"
- Submit button disabled + spinner shown while the server action is running (prevents double-submit)

### Redirect & flow behavior

- Post-login: redirect to dashboard home (/)
- Post-register: auto-login and redirect directly to dashboard (seamless — no intermediate "please log in" step)
- Post-logout: redirect to /login
- Protected route access while logged out: redirect to /login (no callbackUrl — always lands on dashboard after login)

### Claude's Discretion

- Exact split layout proportions (e.g. 40/60 or 50/50)
- Left panel content/imagery beyond logo
- Exact spacing, typography sizing within the Vault design system
- Loading skeleton or transition animations

</decisions>

<specifics>
## Specific Ideas

- Auth pages must be completely separate from the dashboard layout — no sidebar, no header
- The proxy.ts (middleware) already handles protected route redirects to /login — the UI just needs to match this behavior
- SessionProvider goes in the root layout so all client components can access session state

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 04-auth-ui-components_
_Context gathered: 2026-02-24_
