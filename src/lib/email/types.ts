export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: "SMTP_NOT_CONFIGURED" | "TRANSPORTER_UNAVAILABLE" | "SEND_FAILED";
}
