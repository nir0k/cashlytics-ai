import { randomBytes, createHash } from "node:crypto";

/**
 * Token expiry time in milliseconds (1 hour)
 */
export const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Generates a cryptographically secure password reset token.
 *
 * @returns An object containing:
 *   - raw: The 64-character hex token (sent via email, never stored)
 *   - hash: The SHA-256 hash of the token (stored in database)
 */
export function generateResetToken(): { raw: string; hash: string } {
  // Generate 256-bit (32 bytes) cryptographically random token
  const rawBytes = randomBytes(32);
  const raw = rawBytes.toString("hex"); // 64-character hex string

  // Hash the raw token for database storage
  const hash = hashToken(raw);

  return { raw, hash };
}

/**
 * Hashes a raw token using SHA-256.
 * Used when validating tokens from reset links.
 *
 * @param raw - The raw token string to hash
 * @returns The SHA-256 hash as a 64-character hex string
 */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
