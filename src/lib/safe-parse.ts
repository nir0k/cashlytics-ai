/**
 * Safely parses a value to float, returning a fallback (default 0) if the result is NaN.
 */
export function safeParseFloat(value: unknown, fallback = 0): number {
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Normalizes a date to UTC midnight to avoid timezone comparison issues.
 * Use this when comparing dates that should be day-accurate (not time-accurate).
 */
export function toUTCDate(date: Date | string): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
