# Phase 8: Email Templates - Research

**Researched:** 2026-02-25
**Domain:** React Email Templates, HTML Email Development, Email Client Compatibility
**Confidence:** HIGH

## Summary

React Email (@react-email/components) is the modern standard for building HTML email templates in React. It provides server-side rendering of React components to HTML with inline styles, handles cross-client compatibility (Gmail, Outlook, Yahoo, Apple Mail), and includes built-in plaintext generation via @react-email/render. The library uses table-based layouts internally for maximum email client support and requires all styles to be inline (no CSS classes or Tailwind work in email clients).

**Primary recommendation:** Install `@react-email/components` and `@react-email/render`, create templates in `src/emails/` directory, use inline `style` props with Vault dark theme colors, and generate both HTML and plaintext versions for each email.

## Standard Stack

### Core

| Library                 | Version | Purpose                             | Why Standard                                          |
| ----------------------- | ------- | ----------------------------------- | ----------------------------------------------------- |
| @react-email/components | 1.0.8   | All email components in one package | Official React Email package, includes all primitives |
| @react-email/render     | 2.0.4   | Render React to HTML/plaintext      | Handles HTML generation and plaintext conversion      |

### Supporting

| Library      | Version | Purpose                        | When to Use                                |
| ------------ | ------- | ------------------------------ | ------------------------------------------ |
| html-to-text | ^9.0.5  | Plaintext generation (bundled) | Automatic with render({ plainText: true }) |

### Alternatives Considered

| Instead of              | Could Use             | Tradeoff                                                                             |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| @react-email/components | MJML                  | MJML requires separate compilation, React Email integrates with existing React setup |
| @react-email/components | EJS/Handlebars        | No component model, harder to maintain, no type safety                               |
| Inline styles           | @react-email/tailwind | Tailwind still inlines styles, adds complexity without benefit for 2 templates       |

**Installation:**

```bash
npm install @react-email/components @react-email/render
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── emails/
│   ├── base-template.tsx       # Shared layout/styling
│   ├── reset-password.tsx      # Reset password email
│   ├── welcome.tsx             # Welcome email
│   └── index.ts                # Exports + render functions
└── lib/
    └── email/
        └── template-renderer.ts # HTML + plaintext generation
```

### Pattern 1: Base Template with Vault Dark Theme

**What:** Create a reusable base template component that wraps all emails with consistent Vault branding
**When to use:** All emails should use this wrapper for consistent styling

**Example:**

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
  Preview,
} from "@react-email/components";

const VAULT_COLORS = {
  background: "#08080a",
  card: "rgba(255, 255, 255, 0.04)",
  foreground: "#f0ede8",
  primary: "#f59e0b",
  primaryForeground: "#0a0a0b",
  border: "rgba(255, 255, 255, 0.07)",
  muted: "#8a8070",
};

interface BaseEmailProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseEmail({ preview, children }: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: VAULT_COLORS.background, margin: 0, padding: "40px 20px" }}>
        <Container
          style={{
            backgroundColor: VAULT_COLORS.card,
            borderRadius: "16px",
            border: `1px solid ${VAULT_COLORS.border}`,
            maxWidth: "480px",
            margin: "0 auto",
            padding: "40px",
          }}
        >
          {children}
        </Container>
      </Body>
    </Html>
  );
}
```

### Pattern 2: Reset Password Email

**What:** Email with reset link and expiry notice
**When to use:** User requests password reset

**Example:**

```tsx
import { BaseEmail, VAULT_COLORS } from "./base-template";
import { Button, Heading, Text, Hr } from "@react-email/components";

interface ResetPasswordEmailProps {
  resetUrl: string;
  expiresInHours: number;
}

export function ResetPasswordEmail({ resetUrl, expiresInHours }: ResetPasswordEmailProps) {
  return (
    <BaseEmail preview="Reset your password">
      <Heading
        style={{
          color: VAULT_COLORS.foreground,
          fontSize: "24px",
          fontWeight: 700,
          margin: "0 0 16px 0",
        }}
      >
        Reset Your Password
      </Heading>
      <Text style={{ color: VAULT_COLORS.muted, fontSize: "16px", lineHeight: 1.6 }}>
        We received a request to reset your password. Click the button below to create a new one.
      </Text>
      <Button
        href={resetUrl}
        style={{
          backgroundColor: VAULT_COLORS.primary,
          color: VAULT_COLORS.primaryForeground,
          padding: "12px 24px",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: 600,
          display: "inline-block",
        }}
      >
        Reset Password
      </Button>
      <Hr style={{ borderColor: VAULT_COLORS.border, margin: "32px 0" }} />
      <Text style={{ color: VAULT_COLORS.muted, fontSize: "14px" }}>
        This link expires in {expiresInHours} hour(s). If you did not request this, you can safely
        ignore this email.
      </Text>
    </BaseEmail>
  );
}
```

### Pattern 3: Render Function with Plaintext

**What:** Utility to render both HTML and plaintext versions
**When to use:** Before sending via nodemailer

**Example:**

```tsx
import { render } from "@react-email/render";
import { ResetPasswordEmail } from "./reset-password";

export async function renderResetPasswordEmail(resetUrl: string) {
  const html = await render(<ResetPasswordEmail resetUrl={resetUrl} expiresInHours={1} />);
  const text = await render(<ResetPasswordEmail resetUrl={resetUrl} expiresInHours={1} />, {
    plainText: true,
  });
  return { html, text };
}
```

### Anti-Patterns to Avoid

- **Using Tailwind classes:** Email clients don't support Tailwind CSS; use inline `style` props
- **CSS variables:** Email clients don't support CSS custom properties; use hardcoded color values
- **Flexbox/Grid layouts:** Many email clients don't support modern CSS layouts; use table-based layouts (handled by @react-email/components)
- **External stylesheets:** Gmail strips `<style>` tags; all styles must be inline
- **JavaScript:** Email clients don't execute JavaScript; all dynamic content must be pre-rendered

## Don't Hand-Roll

| Problem              | Don't Build              | Use Instead                                | Why                                            |
| -------------------- | ------------------------ | ------------------------------------------ | ---------------------------------------------- |
| Email layout tables  | Custom `<table>` markup  | @react-email Container, Section, Column    | Handles cross-client quirks, responsive design |
| Button styling       | Custom `<a>` with styles | @react-email Button                        | Handles Outlook VML fallbacks                  |
| Plaintext conversion | Custom HTML parser       | @react-email/render with `plainText: true` | Uses battle-tested html-to-text library        |
| Email preview text   | Hidden div               | @react-email Preview                       | Proper placement for email client preview      |

**Key insight:** Email client rendering is notoriously inconsistent. @react-email/components handles Outlook VML, Gmail style stripping, and Apple Mail quirks automatically.

## Common Pitfalls

### Pitfall 1: Using CSS Classes Instead of Inline Styles

**What goes wrong:** Gmail strips `<style>` tags; styles are lost
**Why it happens:** Web developers are used to CSS classes
**How to avoid:** Always use `style={{ ... }}` props on every element
**Warning signs:** Styles appear in browser preview but not in Gmail

### Pitfall 2: Missing Plaintext Version

**What goes wrong:** Higher spam score, some clients reject HTML-only emails
**Why it happens:** Developers forget plaintext is required
**How to avoid:** Always call render twice - once for HTML, once with `plainText: true`
**Warning signs:** Emails going to spam folder

### Pitfall 3: Incorrect Color Formats

**What goes wrong:** RGBA colors may not work in all clients
**Why it happens:** Using modern CSS color formats
**How to avoid:** Use hex colors (`#f59e0b`) for broad compatibility; test rgba carefully
**Warning signs:** Colors appearing differently in Outlook vs Gmail

### Pitfall 4: Forgetting Preview Text

**What goes wrong:** Email clients show first visible text as preview (often "Reset Password")
**Why it happens:** Not including `<Preview>` component
**How to avoid:** Always include Preview component with meaningful summary
**Warning signs:** Gmail showing truncated/unhelpful preview

## Code Examples

### Complete Email Renderer Utility

```tsx
import { render } from "@react-email/components";
import { ResetPasswordEmail } from "./reset-password";
import { WelcomeEmail } from "./welcome";

export async function renderResetPasswordEmail(resetUrl: string) {
  const component = <ResetPasswordEmail resetUrl={resetUrl} expiresInHours={1} />;
  const [html, text] = await Promise.all([
    render(component),
    render(component, { plainText: true }),
  ]);
  return { html, text, subject: "Reset Your Password" };
}

export async function renderWelcomeEmail(userName: string) {
  const component = <WelcomeEmail userName={userName} />;
  const [html, text] = await Promise.all([
    render(component),
    render(component, { plainText: true }),
  ]);
  return { html, text, subject: "Welcome to Cashlytics" };
}
```

### Nodemailer Integration

```tsx
import nodemailer from "nodemailer";
import { renderResetPasswordEmail } from "@/emails";

export async function sendResetPasswordEmail(to: string, resetUrl: string) {
  const { html, text, subject } = await renderResetPasswordEmail(resetUrl);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
    text,
  });
}
```

## State of the Art

| Old Approach          | Current Approach | When Changed | Impact                              |
| --------------------- | ---------------- | ------------ | ----------------------------------- |
| String template HTML  | React components | 2023+        | Type safety, reusability, better DX |
| MJML compilation      | @react-email     | 2023+        | Native React, no build step         |
| HTML-only emails      | HTML + plaintext | Always       | Better deliverability               |
| CSS in `<style>` tags | Inline styles    | Always       | Gmail compatibility                 |

**Deprecated/outdated:**

- MJML with separate build pipeline: Use @react-email for React-native approach
- EJS/Handlebars templates: Use React components for type safety

## Vault Dark Theme Colors

Extracted from `src/app/globals.css` for email templates:

```typescript
const VAULT_COLORS = {
  background: "#08080a",
  foreground: "#f0ede8",
  card: "rgba(255, 255, 255, 0.04)",
  cardBorder: "rgba(255, 255, 255, 0.07)",
  primary: "#f59e0b",
  primaryForeground: "#0a0a0b",
  muted: "#8a8070",
  border: "rgba(255, 255, 255, 0.07)",
};
```

## Open Questions

1. **Should we use @react-email/tailwind for styling?**
   - What we know: It exists and can inline Tailwind classes
   - What's unclear: Whether it adds value for just 2 templates
   - Recommendation: Skip for now; use inline styles directly. Simpler for 2 templates, and colors need to be hardcoded anyway.

2. **Should emails use light or dark theme?**
   - What we know: App has both themes, dark is default
   - What's unclear: Whether users expect dark emails
   - Recommendation: Use dark theme (Vault) as per requirements. Consistent with app branding.

## Phase Requirements

| ID           | Description                                                | Research Support                                       |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------ |
| TEMPLATES-01 | Reset password email uses Vault-branded dark HTML template | BaseEmail pattern with VAULT_COLORS                    |
| TEMPLATES-02 | Welcome email uses Vault-branded dark HTML template        | BaseEmail pattern with VAULT_COLORS                    |
| TEMPLATES-03 | All email styles are inline                                | @react-email/components uses inline `style` props only |
| TEMPLATES-04 | Emails include plaintext fallback                          | render() with `{ plainText: true }` option             |
| TEMPLATES-05 | Reset email includes token expiry notice (1 hour)          | ResetPasswordEmail with expiresInHours prop            |

## Sources

### Primary (HIGH confidence)

- https://github.com/resend/react-email - Official repository, README with component list
- https://unpkg.com/@react-email/components@1.0.8/package.json - Package structure, dependencies
- https://unpkg.com/@react-email/render@2.0.4/dist/node/index.d.ts - TypeScript definitions for render function
- src/app/globals.css - Vault dark theme color values

### Secondary (MEDIUM confidence)

- GitHub README patterns for React Email usage
- html-to-text library (bundled dependency) for plaintext generation

### Tertiary (LOW confidence)

- None - all critical information verified from primary sources

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - @react-email/components is the official standard, well-documented
- Architecture: HIGH - Pattern matches React Email best practices and project conventions
- Pitfalls: HIGH - Email client limitations are well-known, documented in React Email docs

**Research date:** 2026-02-25
**Valid until:** 90 days - React Email API is stable, colors from project theme
