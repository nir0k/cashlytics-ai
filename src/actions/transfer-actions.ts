"use server";

import { db } from "@/lib/db";
import { transfers, accounts } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ApiResponse, Transfer, NewTransfer, TransferWithDetails } from "@/types/database";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth/require-auth";

export async function getTransfers(filters?: {
  sourceAccountId?: string;
  targetAccountId?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<ApiResponse<TransferWithDetails[]>> {
  try {
    const authResult = await requireAuth();
    if (authResult.error) {
      return { success: false, error: "Unauthorized" };
    }
    const { userId } = authResult;

    const conditions = [eq(transfers.userId, userId)];
    if (filters?.sourceAccountId) {
      conditions.push(eq(transfers.sourceAccountId, filters.sourceAccountId));
    }
    if (filters?.targetAccountId) {
      conditions.push(eq(transfers.targetAccountId, filters.targetAccountId));
    }
    if (filters?.startDate) {
      conditions.push(gte(transfers.startDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(transfers.startDate, filters.endDate));
    }

    const result = await db.query.transfers.findMany({
      where: and(...conditions),
      with: {
        sourceAccount: true,
        targetAccount: true,
      },
      orderBy: [desc(transfers.startDate)],
    });

    return { success: true, data: result as TransferWithDetails[] };
  } catch (error) {
    logger.error("Failed to fetch transfers", "getTransfers", error);
    return { success: false, error: "Transfers konnten nicht geladen werden" };
  }
}

export async function createTransfer(
  data: Omit<NewTransfer, "userId">
): Promise<ApiResponse<Transfer>> {
  try {
    if (data.sourceAccountId === data.targetAccountId) {
      return { success: false, error: "Quell- und Zielkonto müssen unterschiedlich sein" };
    }

    const authResult = await requireAuth();
    if (authResult.error) {
      return { success: false, error: "Unauthorized" };
    }
    const { userId } = authResult;

    // FK Validation: BOTH accounts must belong to the authenticated user (DATA-10)
    const [sourceAccount] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, data.sourceAccountId), eq(accounts.userId, userId)))
      .limit(1);
    if (!sourceAccount) {
      return { success: false, error: "Quellkonto nicht gefunden oder kein Zugriff." };
    }
    const [targetAccount] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, data.targetAccountId), eq(accounts.userId, userId)))
      .limit(1);
    if (!targetAccount) {
      return { success: false, error: "Zielkonto nicht gefunden oder kein Zugriff." };
    }

    const transfer = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(transfers)
        .values({ ...data, userId })
        .returning();

      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} - ${data.amount}` })
        .where(eq(accounts.id, data.sourceAccountId));

      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${data.amount}` })
        .where(eq(accounts.id, data.targetAccountId));

      return created;
    });

    revalidatePath("/transfers");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { success: true, data: transfer };
  } catch (error) {
    logger.error("Failed to create transfer", "createTransfer", error);
    return { success: false, error: "Transfer konnte nicht erstellt werden" };
  }
}

export async function updateTransfer(
  id: string,
  data: Partial<NewTransfer>
): Promise<ApiResponse<Transfer>> {
  try {
    if (
      data.sourceAccountId &&
      data.targetAccountId &&
      data.sourceAccountId === data.targetAccountId
    ) {
      return { success: false, error: "Quell- und Zielkonto müssen unterschiedlich sein" };
    }

    const authResult = await requireAuth();
    if (authResult.error) {
      return { success: false, error: "Unauthorized" };
    }
    const { userId } = authResult;

    const transfer = await db.transaction(async (tx) => {
      // Fetch old transfer to reverse its balance effect (userId scoped)
      const [old] = await tx
        .select()
        .from(transfers)
        .where(and(eq(transfers.id, id), eq(transfers.userId, userId)));
      if (!old) {
        return null;
      }

      // Reverse old balance change
      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${old.amount}` })
        .where(eq(accounts.id, old.sourceAccountId));

      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} - ${old.amount}` })
        .where(eq(accounts.id, old.targetAccountId));

      // Write the update (userId scoped)
      const [updated] = await tx
        .update(transfers)
        .set(data)
        .where(and(eq(transfers.id, id), eq(transfers.userId, userId)))
        .returning();

      // Apply new balance change (merge old values with the patch)
      const newSourceId = data.sourceAccountId ?? old.sourceAccountId;
      const newTargetId = data.targetAccountId ?? old.targetAccountId;
      const newAmount = data.amount ?? old.amount;

      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} - ${newAmount}` })
        .where(eq(accounts.id, newSourceId));

      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${newAmount}` })
        .where(eq(accounts.id, newTargetId));

      return updated;
    });

    if (!transfer) {
      return { success: false, error: "Transfer nicht gefunden." };
    }

    revalidatePath("/transfers");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { success: true, data: transfer };
  } catch (error) {
    logger.error("Failed to update transfer", "updateTransfer", error);
    return { success: false, error: "Transfer konnte nicht aktualisiert werden" };
  }
}

export async function deleteTransfer(id: string): Promise<ApiResponse<void>> {
  try {
    const authResult = await requireAuth();
    if (authResult.error) {
      return { success: false, error: "Unauthorized" };
    }
    const { userId } = authResult;

    const deleted = await db.transaction(async (tx) => {
      const [transfer] = await tx
        .select()
        .from(transfers)
        .where(and(eq(transfers.id, id), eq(transfers.userId, userId)));
      if (!transfer) {
        return null;
      }

      // Reverse the balance change
      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${transfer.amount}` })
        .where(eq(accounts.id, transfer.sourceAccountId));

      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} - ${transfer.amount}` })
        .where(eq(accounts.id, transfer.targetAccountId));

      await tx.delete(transfers).where(and(eq(transfers.id, id), eq(transfers.userId, userId)));

      return transfer;
    });

    if (!deleted) {
      return { success: false, error: "Transfer nicht gefunden." };
    }

    revalidatePath("/transfers");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { success: true, data: undefined };
  } catch (error) {
    logger.error("Failed to delete transfer", "deleteTransfer", error);
    return { success: false, error: "Transfer konnte nicht gelöscht werden" };
  }
}
