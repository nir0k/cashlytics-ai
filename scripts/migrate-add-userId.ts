// scripts/migrate-add-userId.ts
// Backfill script that assigns all existing data to the user defined by SINGLE_USER_EMAIL
// Run after migration 0004 (nullable userId columns) and before migration 0006 (NOT NULL constraint)

/* eslint-disable @typescript-eslint/no-explicit-any */

import "dotenv/config";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  expenses,
  incomes,
  dailyExpenses,
  transfers,
  categories,
  documents,
  conversations,
} from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";

async function main() {
  const email = process.env.SINGLE_USER_EMAIL;
  const initialPassword = process.env.INITIAL_PASSWORD || "changeme";

  if (!email) {
    throw new Error("SINGLE_USER_EMAIL environment variable is required");
  }

  console.log(`Starting backfill for user: ${email}`);

  // 1. Create the single user if not exists
  const hashedPassword = await hashPassword(initialPassword);
  const [user] = await db
    .insert(users)
    .values({
      email,
      name: email.split("@")[0],
      password: hashedPassword,
      emailVerified: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  const singleUser =
    user ??
    (await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then((r) => r[0]));

  if (!singleUser) {
    throw new Error("Failed to get or create single user");
  }

  console.log(`Using user: ${singleUser.email} (${singleUser.id})`);

  // 2. Backfill all tables
  const tables = [
    { name: "accounts", table: accounts },
    { name: "expenses", table: expenses },
    { name: "incomes", table: incomes },
    { name: "dailyExpenses", table: dailyExpenses },
    { name: "transfers", table: transfers },
    { name: "categories", table: categories },
    { name: "documents", table: documents },
    { name: "conversations", table: conversations },
  ];

  for (const { name, table } of tables) {
    // Use any to access userId dynamically
    await db
      .update(table as any)
      .set({ userId: singleUser.id })
      .where(isNull((table as any).userId));
    console.log(`Updated ${name}`);
  }

  // 3. Verify no NULL userId remain
  for (const { name, table } of tables) {
    const nullRows = await db
      .select()
      .from(table as any)
      .where(isNull((table as any).userId))
      .limit(1);
    if (nullRows.length > 0) {
      throw new Error(`Table ${name} still has rows with NULL userId`);
    }
  }

  console.log("Backfill complete! All data assigned to user:", singleUser.email);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
