import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

/**
 * Returns true if new user registration is currently permitted.
 *
 * SINGLE_USER_MODE=true  → registration is open only when no users exist yet.
 * SINGLE_USER_MODE=false (or unset) → registration is always open.
 *
 * NEVER check process.env.SINGLE_USER_MODE with a truthy check — "false" is
 * a truthy string. Always compare === "true".
 */
export async function isRegistrationOpen(): Promise<boolean> {
  const singleUserMode = process.env.SINGLE_USER_MODE === "true";
  if (!singleUserMode) return true;

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);

  return count === 0;
}
