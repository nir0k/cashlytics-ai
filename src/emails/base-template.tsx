import { Html, Head, Body, Preview, Container, Section } from "@react-email/components";
import * as React from "react";

/**
 * Vault dark theme colors extracted from globals.css
 * Used across all email templates for consistent branding
 */
export const VAULT_COLORS = {
  background: "#08080a",
  foreground: "#f0ede8",
  primary: "#f59e0b",
  primaryForeground: "#0a0a0b",
  muted: "#8a8070",
  border: "rgba(255, 255, 255, 0.07)",
  card: "rgba(255, 255, 255, 0.04)",
};

interface BaseEmailProps {
  /** Text shown in email client preview (before opening email) */
  preview: string;
  /** Email content */
  children: React.ReactNode;
}

/**
 * Base email template with Vault dark theme branding.
 * Wraps all transactional emails with consistent styling.
 *
 * Features:
 * - Dark background (#08080a) matching Vault app theme
 * - Card-like container with subtle border and rounded corners
 * - Max-width 480px for email client compatibility
 * - All styles inline (no CSS classes)
 */
export function BaseEmail({ preview, children }: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: VAULT_COLORS.background,
          margin: 0,
          padding: "40px 20px",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <Container
          style={{
            backgroundColor: VAULT_COLORS.card,
            borderRadius: "16px",
            border: `1px solid ${VAULT_COLORS.border}`,
            maxWidth: "480px",
            margin: "0 auto",
          }}
        >
          <Section style={{ padding: "48px 56px" }}>{children}</Section>
        </Container>
        <Section
          style={{
            textAlign: "center",
            paddingTop: "24px",
            paddingBottom: "24px",
          }}
        >
          <img
            src="https://cashlytics.online/logo.svg"
            alt="Cashlytics"
            width="32"
            height="32"
            style={{ margin: "0 auto" }}
          />
        </Section>
      </Body>
    </Html>
  );
}
