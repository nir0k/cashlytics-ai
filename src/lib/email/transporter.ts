import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";
import type { SendEmailOptions, SendEmailResult } from "./types";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

let transporter: nodemailer.Transporter | null = null;
let configChecked = false;
let isConfigured = false;

function getSmtpConfig(): SmtpConfig | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  const port = parseInt(SMTP_PORT, 10);
  if (isNaN(port)) {
    logger.warn("SMTP_PORT is not a valid number", "email");
    return null;
  }

  return {
    host: SMTP_HOST,
    port,
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: SMTP_FROM || SMTP_USER,
  };
}

export function isEmailConfigured(): boolean {
  if (!configChecked) {
    configChecked = true;
    isConfigured = getSmtpConfig() !== null;
  }
  return isConfigured;
}

export function getTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }

  const config = getSmtpConfig();
  if (!config) {
    logger.warn("SMTP not configured - email features disabled", "email");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465, // true for 465, false for other ports
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    logger.info(`Email not sent (SMTP not configured): ${options.to}`, "email");
    return { success: false, error: "SMTP_NOT_CONFIGURED" };
  }

  const mailTransporter = getTransporter();
  if (!mailTransporter) {
    return { success: false, error: "TRANSPORTER_UNAVAILABLE" };
  }

  const config = getSmtpConfig();

  try {
    await mailTransporter.sendMail({
      from: config!.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    logger.info(`Email sent: ${options.to}`, "email");
    return { success: true };
  } catch (error) {
    logger.error(`Email send failed: ${options.to}`, "email", error);
    return { success: false, error: "SEND_FAILED" };
  }
}
