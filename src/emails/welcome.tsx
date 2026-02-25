import { Heading, Hr, Text } from "@react-email/components";
import * as React from "react";
import { BaseEmail, VAULT_COLORS } from "./base-template";

interface WelcomeEmailProps {
  /** Name of the user who just registered */
  userName: string;
}

/**
 * Welcome email template for new users.
 * Sent after successful account registration.
 *
 * Features:
 * - Vault dark theme branding via BaseEmail wrapper
 * - Personalized greeting with user's name
 * - Friendly onboarding message
 * - All styles inline for email client compatibility
 */
export function WelcomeEmail({ userName }: WelcomeEmailProps) {
  return (
    <BaseEmail preview="Welcome to Cashlytics">
      <Heading
        style={{
          color: VAULT_COLORS.foreground,
          fontSize: "24px",
          fontWeight: 700,
          margin: "0 0 16px 0",
        }}
      >
        Welcome to Cashlytics
      </Heading>
      <Text
        style={{
          color: VAULT_COLORS.foreground,
          fontSize: "16px",
          lineHeight: 1.6,
          margin: "0 0 16px 0",
        }}
      >
        Hi {userName},
      </Text>
      <Text
        style={{
          color: VAULT_COLORS.foreground,
          fontSize: "16px",
          lineHeight: 1.6,
          margin: "0 0 24px 0",
        }}
      >
        Thanks for creating your account. You&apos;re all set to start tracking your finances and
        gaining insights into your spending habits.
      </Text>
      <Text
        style={{
          color: VAULT_COLORS.muted,
          fontSize: "16px",
          lineHeight: 1.6,
          margin: "0 0 24px 0",
        }}
      >
        If you have any questions, feel free to reach out. We&apos;re here to help!
      </Text>
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
        }}
      >
        The Cashlytics Team
      </Text>
    </BaseEmail>
  );
}
