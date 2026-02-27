import { Button, Heading, Hr, Text } from "@react-email/components";
import * as React from "react";
import { BaseEmail, VAULT_COLORS } from "./base-template";

interface ResetPasswordEmailProps {
  /** Full URL for password reset including token */
  resetUrl: string;
  /** Number of hours until the reset link expires */
  expiresInHours: number;
}

/**
 * Reset password email template.
 * Sent when a user requests a password reset.
 *
 * Features:
 * - Vault dark theme branding via BaseEmail wrapper
 * - Prominent call-to-action button
 * - Expiry notice for security awareness
 * - All styles inline for email client compatibility
 */
export function ResetPasswordEmail({ resetUrl, expiresInHours }: ResetPasswordEmailProps) {
  return (
    <BaseEmail preview="Reset your password">
      <Heading
        style={{
          color: VAULT_COLORS.foreground,
          fontSize: "24px",
          fontWeight: 700,
          margin: "0 0 16px 0",
          padding: "16px 16px 0 16px",
        }}
      >
        Reset Your Password
      </Heading>
      <Text
        style={{
          color: VAULT_COLORS.muted,
          fontSize: "16px",
          lineHeight: 1.6,
          margin: "0 0 24px 0",
          padding: "0 16px 0 16px",
        }}
      >
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
      <Hr
        style={{
          borderColor: VAULT_COLORS.border,
          margin: "32px 0",
        }}
      />
      <Text
        style={{
          color: VAULT_COLORS.muted,
          fontSize: "14px",
          lineHeight: 1.5,
          margin: 0,
          padding: "0 16px 16px 16px",
        }}
      >
        This link expires in {expiresInHours} hour
        {expiresInHours !== 1 ? "s" : ""}. If you did not request this, you can safely ignore this
        email.
      </Text>
    </BaseEmail>
  );
}
