"use server";

import { db } from "@/lib/db";
import { accounts, incomes, expenses, dailyExpenses, categories } from "@/lib/db/schema";
import { and, gte, lte, sql, desc, eq } from "drizzle-orm";
import type { ApiResponse, Account, DailyExpenseWithDetails } from "@/types/database";
import { safeParseFloat } from "@/lib/safe-parse";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth/require-auth";

function normalizeToMonthly(
  amount: number,
  recurrenceType: string,
  recurrenceInterval: number | null
): number {
  switch (recurrenceType) {
    case "daily":
      return amount * 30;
    case "weekly":
      return amount * 4.33;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "semiannual":
      return amount / 6;
    case "yearly":
      return amount / 12;
    case "custom":
      return recurrenceInterval ? amount / recurrenceInterval : amount;
    default:
      return 0;
  }
}

interface DashboardStats {
  totalAssets: number;
  reserveView: {
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsRate: number;
    incomeTrend: number;
    expenseTrend: number;
  };
  cashflowView: {
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsRate: number;
    incomeTrend: number;
    expenseTrend: number;
  };
}

function getMonthDateRange(reference: Date): { monthStart: Date; monthEnd: Date } {
  const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
  return { monthStart, monthEnd };
}

function normalizeIncomeToMonthly(amount: number, recurrenceType: string): number {
  switch (recurrenceType) {
    case "monthly":
      return amount;
    case "yearly":
      return amount / 12;
    default:
      return 0;
  }
}

function isRecurringInMonth(
  item: {
    startDate: Date;
    endDate?: Date | null;
    recurrenceType: string;
    recurrenceInterval?: number | null;
  },
  monthStart: Date,
  monthEnd: Date
): boolean {
  const itemStart = new Date(item.startDate);
  const itemEnd = item.endDate ? new Date(item.endDate) : null;

  if (itemStart > monthEnd) return false;
  if (itemEnd !== null && itemEnd < monthStart) return false;

  const monthDiff =
    (monthStart.getFullYear() - itemStart.getFullYear()) * 12 +
    (monthStart.getMonth() - itemStart.getMonth());

  switch (item.recurrenceType) {
    case "once":
      return itemStart >= monthStart && itemStart <= monthEnd;
    case "daily":
    case "weekly":
    case "monthly":
      return true;
    case "quarterly":
      return monthDiff >= 0 && monthDiff % 3 === 0;
    case "semiannual":
      return monthDiff >= 0 && monthDiff % 6 === 0;
    case "yearly":
      return monthDiff >= 0 && monthDiff % 12 === 0;
    case "custom": {
      const interval = item.recurrenceInterval;
      if (!interval) return true;
      return monthDiff >= 0 && monthDiff % interval === 0;
    }
    default:
      return false;
  }
}

interface CategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  total: number;
  percentage: number;
}

export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  const auth = await requireAuth();
  if (auth.error) return { success: false, error: "Unauthorized" };
  const { userId } = auth;

  try {
    // Gesamtvermögen (Summe aller Konten des Users)
    const accountsResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(balance), 0)`,
      })
      .from(accounts)
      .where(eq(accounts.userId, userId));
    const totalAssets = safeParseFloat(accountsResult[0]?.total || "0");

    const now = new Date();
    const { monthStart: currentMonthStart, monthEnd: currentMonthEnd } = getMonthDateRange(now);
    const { monthStart: lastMonthStart, monthEnd: lastMonthEnd } = getMonthDateRange(
      new Date(now.getFullYear(), now.getMonth() - 1, 1)
    );

    const [allIncomes, allExpenses, currentMonthDailyExpenses, lastMonthDailyExpenses] =
      await Promise.all([
        db
          .select({
            amount: incomes.amount,
            recurrenceType: incomes.recurrenceType,
            startDate: incomes.startDate,
            endDate: incomes.endDate,
          })
          .from(incomes)
          .where(eq(incomes.userId, userId)),

        db
          .select({
            amount: expenses.amount,
            recurrenceType: expenses.recurrenceType,
            recurrenceInterval: expenses.recurrenceInterval,
            startDate: expenses.startDate,
            endDate: expenses.endDate,
          })
          .from(expenses)
          .where(eq(expenses.userId, userId)),

        db
          .select({
            total: sql<string>`COALESCE(SUM(amount), 0)`,
          })
          .from(dailyExpenses)
          .where(
            and(
              eq(dailyExpenses.userId, userId),
              gte(dailyExpenses.date, currentMonthStart),
              lte(dailyExpenses.date, currentMonthEnd)
            )
          ),

        db
          .select({
            total: sql<string>`COALESCE(SUM(amount), 0)`,
          })
          .from(dailyExpenses)
          .where(
            and(
              eq(dailyExpenses.userId, userId),
              gte(dailyExpenses.date, lastMonthStart),
              lte(dailyExpenses.date, lastMonthEnd)
            )
          ),
      ]);

    const currentDailyExpensesTotal = safeParseFloat(currentMonthDailyExpenses[0]?.total || "0");
    const lastDailyExpensesTotal = safeParseFloat(lastMonthDailyExpenses[0]?.total || "0");

    const reserveMonthlyIncome = allIncomes.reduce((sum, inc) => {
      const amount = safeParseFloat(inc.amount);
      if (inc.recurrenceType === "once") {
        return inc.startDate >= currentMonthStart && inc.startDate <= currentMonthEnd
          ? sum + amount
          : sum;
      }
      const hasStarted = inc.startDate <= now;
      const isActive = !inc.endDate || inc.endDate >= currentMonthStart;
      if (!hasStarted || !isActive) return sum;
      return sum + normalizeIncomeToMonthly(amount, inc.recurrenceType);
    }, 0);

    const reserveLastMonthlyIncome = allIncomes.reduce((sum, inc) => {
      const amount = safeParseFloat(inc.amount);
      if (inc.recurrenceType === "once") {
        return inc.startDate >= lastMonthStart && inc.startDate <= lastMonthEnd
          ? sum + amount
          : sum;
      }
      const hasStarted = inc.startDate <= lastMonthEnd;
      const isActive = !inc.endDate || inc.endDate >= lastMonthStart;
      if (!hasStarted || !isActive) return sum;
      return sum + normalizeIncomeToMonthly(amount, inc.recurrenceType);
    }, 0);

    const reserveMonthlyExpenses =
      currentDailyExpensesTotal +
      allExpenses.reduce((sum, exp) => {
        const hasStarted = exp.startDate <= now;
        const isActive = !exp.endDate || exp.endDate >= currentMonthStart;
        if (!hasStarted || !isActive) return sum;
        return (
          sum +
          normalizeToMonthly(safeParseFloat(exp.amount), exp.recurrenceType, exp.recurrenceInterval)
        );
      }, 0);

    const reserveLastMonthlyExpenses =
      lastDailyExpensesTotal +
      allExpenses.reduce((sum, exp) => {
        const hasStarted = exp.startDate <= lastMonthEnd;
        const isActive = !exp.endDate || exp.endDate >= lastMonthStart;
        if (!hasStarted || !isActive) return sum;
        return (
          sum +
          normalizeToMonthly(safeParseFloat(exp.amount), exp.recurrenceType, exp.recurrenceInterval)
        );
      }, 0);

    const cashflowMonthlyIncome = allIncomes.reduce((sum, inc) => {
      const inCurrentMonth = isRecurringInMonth(
        {
          startDate: inc.startDate,
          endDate: inc.endDate,
          recurrenceType: inc.recurrenceType,
        },
        currentMonthStart,
        currentMonthEnd
      );
      return inCurrentMonth ? sum + safeParseFloat(inc.amount) : sum;
    }, 0);

    const cashflowLastMonthlyIncome = allIncomes.reduce((sum, inc) => {
      const inLastMonth = isRecurringInMonth(
        {
          startDate: inc.startDate,
          endDate: inc.endDate,
          recurrenceType: inc.recurrenceType,
        },
        lastMonthStart,
        lastMonthEnd
      );
      return inLastMonth ? sum + safeParseFloat(inc.amount) : sum;
    }, 0);

    const cashflowMonthlyExpenses =
      currentDailyExpensesTotal +
      allExpenses.reduce((sum, exp) => {
        const inCurrentMonth = isRecurringInMonth(
          {
            startDate: exp.startDate,
            endDate: exp.endDate,
            recurrenceType: exp.recurrenceType,
            recurrenceInterval: exp.recurrenceInterval,
          },
          currentMonthStart,
          currentMonthEnd
        );
        return inCurrentMonth ? sum + safeParseFloat(exp.amount) : sum;
      }, 0);

    const cashflowLastMonthlyExpenses =
      lastDailyExpensesTotal +
      allExpenses.reduce((sum, exp) => {
        const inLastMonth = isRecurringInMonth(
          {
            startDate: exp.startDate,
            endDate: exp.endDate,
            recurrenceType: exp.recurrenceType,
            recurrenceInterval: exp.recurrenceInterval,
          },
          lastMonthStart,
          lastMonthEnd
        );
        return inLastMonth ? sum + safeParseFloat(exp.amount) : sum;
      }, 0);

    const reserveSavingsRate = reserveMonthlyIncome - reserveMonthlyExpenses;
    const cashflowSavingsRate = cashflowMonthlyIncome - cashflowMonthlyExpenses;

    const reserveIncomeTrend =
      reserveLastMonthlyIncome > 0
        ? ((reserveMonthlyIncome - reserveLastMonthlyIncome) / reserveLastMonthlyIncome) * 100
        : 0;

    const reserveExpenseTrend =
      reserveLastMonthlyExpenses > 0
        ? ((reserveMonthlyExpenses - reserveLastMonthlyExpenses) / reserveLastMonthlyExpenses) * 100
        : 0;

    const cashflowIncomeTrend =
      cashflowLastMonthlyIncome > 0
        ? ((cashflowMonthlyIncome - cashflowLastMonthlyIncome) / cashflowLastMonthlyIncome) * 100
        : 0;

    const cashflowExpenseTrend =
      cashflowLastMonthlyExpenses > 0
        ? ((cashflowMonthlyExpenses - cashflowLastMonthlyExpenses) / cashflowLastMonthlyExpenses) *
          100
        : 0;

    return {
      success: true,
      data: {
        totalAssets,
        reserveView: {
          monthlyIncome: reserveMonthlyIncome,
          monthlyExpenses: reserveMonthlyExpenses,
          savingsRate: reserveSavingsRate,
          incomeTrend: reserveIncomeTrend,
          expenseTrend: -reserveExpenseTrend,
        },
        cashflowView: {
          monthlyIncome: cashflowMonthlyIncome,
          monthlyExpenses: cashflowMonthlyExpenses,
          savingsRate: cashflowSavingsRate,
          incomeTrend: cashflowIncomeTrend,
          expenseTrend: -cashflowExpenseTrend,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to fetch dashboard stats", "getDashboardStats", error);
    return {
      success: false,
      error: `Failed to fetch dashboard stats: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getCategoryBreakdown(
  startDate: Date = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
): Promise<ApiResponse<CategoryBreakdown[]>> {
  const auth = await requireAuth();
  if (auth.error) return { success: false, error: "Unauthorized" };
  const { userId } = auth;

  try {
    const categoryMap = new Map<
      string,
      {
        categoryName: string;
        categoryIcon: string | null;
        categoryColor: string | null;
        total: number;
      }
    >();

    const dailyExpensesResult = await db
      .select({
        categoryId: dailyExpenses.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        amount: dailyExpenses.amount,
      })
      .from(dailyExpenses)
      .leftJoin(categories, sql`${dailyExpenses.categoryId} = ${categories.id}`)
      .where(and(eq(dailyExpenses.userId, userId), gte(dailyExpenses.date, startDate)));

    for (const row of dailyExpensesResult) {
      const categoryId = row.categoryId || "uncategorized";
      const amount = safeParseFloat(row.amount);
      if (categoryMap.has(categoryId)) {
        categoryMap.get(categoryId)!.total += amount;
      } else {
        categoryMap.set(categoryId, {
          categoryName: row.categoryName || "Ohne Kategorie",
          categoryIcon: row.categoryIcon,
          categoryColor: row.categoryColor,
          total: amount,
        });
      }
    }

    const periodicExpensesResult = await db
      .select({
        categoryId: expenses.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        amount: expenses.amount,
        recurrenceType: expenses.recurrenceType,
        recurrenceInterval: expenses.recurrenceInterval,
        endDate: expenses.endDate,
      })
      .from(expenses)
      .leftJoin(categories, sql`${expenses.categoryId} = ${categories.id}`)
      .where(
        and(
          eq(expenses.userId, userId),
          sql`${expenses.endDate} IS NULL OR ${expenses.endDate} >= ${startDate.toISOString()}`
        )
      );

    for (const row of periodicExpensesResult) {
      if (row.recurrenceType === "once") continue;

      const categoryId = row.categoryId || "uncategorized-periodic";
      const monthlyAmount = normalizeToMonthly(
        safeParseFloat(row.amount),
        row.recurrenceType,
        row.recurrenceInterval
      );

      if (categoryMap.has(categoryId)) {
        categoryMap.get(categoryId)!.total += monthlyAmount;
      } else {
        categoryMap.set(categoryId, {
          categoryName: row.categoryName || "Ohne Kategorie",
          categoryIcon: row.categoryIcon,
          categoryColor: row.categoryColor,
          total: monthlyAmount,
        });
      }
    }

    const totalSum = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.total, 0);

    const breakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.categoryName,
        categoryIcon: data.categoryIcon,
        categoryColor: data.categoryColor,
        total: data.total,
        percentage: totalSum > 0 ? (data.total / totalSum) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return { success: true, data: breakdown };
  } catch (error) {
    logger.error("Failed to fetch category breakdown", "getCategoryBreakdown", error);
    return { success: false, error: "Failed to fetch category breakdown" };
  }
}

export async function getRecentTransactions(
  limit: number = 5
): Promise<ApiResponse<DailyExpenseWithDetails[]>> {
  const auth = await requireAuth();
  if (auth.error) return { success: false, error: "Unauthorized" };
  const { userId } = auth;

  try {
    const transactions = await db.query.dailyExpenses.findMany({
      with: {
        account: true,
        category: true,
      },
      where: eq(dailyExpenses.userId, userId),
      orderBy: [desc(dailyExpenses.date)],
      limit,
    });

    return { success: true, data: transactions as DailyExpenseWithDetails[] };
  } catch (error) {
    logger.error("Failed to fetch recent transactions", "getRecentTransactions", error);
    return { success: false, error: "Failed to fetch recent transactions" };
  }
}

export async function getAccounts(): Promise<ApiResponse<Account[]>> {
  const auth = await requireAuth();
  if (auth.error) return { success: false, error: "Unauthorized" };
  const { userId } = auth;

  try {
    const allAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(accounts.name);
    return { success: true, data: allAccounts };
  } catch (error) {
    logger.error("Failed to fetch accounts", "getAccounts", error);
    return { success: false, error: "Failed to fetch accounts" };
  }
}

interface UpcomingPayment {
  id: string;
  name: string;
  amount: number;
  date: Date;
  type: "expense" | "daily_expense";
  category: {
    name: string | null;
    icon: string | null;
    color: string | null;
  } | null;
  isSubscription: boolean;
}

function getNextPaymentDate(
  startDate: Date,
  recurrenceType: string,
  recurrenceInterval: number | null
): Date {
  const now = new Date();
  const start = new Date(startDate);

  const buildDateWithStartDay = (year: number, month: number): Date => {
    const maxDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(start.getDate(), maxDay));
  };

  switch (recurrenceType) {
    case "daily": {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    case "weekly": {
      const daysUntilNext = (7 - ((now.getDay() - start.getDay() + 7) % 7)) % 7 || 7;
      const next = new Date(now);
      next.setDate(next.getDate() + daysUntilNext);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    case "monthly": {
      let next = buildDateWithStartDay(now.getFullYear(), now.getMonth());
      if (next <= now) {
        next = buildDateWithStartDay(now.getFullYear(), now.getMonth() + 1);
      }
      return next;
    }
    case "quarterly": {
      const monthsSinceStart =
        (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      const remainder = ((monthsSinceStart % 3) + 3) % 3;
      const monthsUntilNext = remainder === 0 ? 0 : 3 - remainder;
      let next = buildDateWithStartDay(now.getFullYear(), now.getMonth() + monthsUntilNext);
      if (next <= now) {
        next = buildDateWithStartDay(now.getFullYear(), now.getMonth() + monthsUntilNext + 3);
      }
      return next;
    }
    case "yearly": {
      const next = new Date(now.getFullYear() + 1, start.getMonth(), start.getDate());
      if (next <= now) {
        next.setFullYear(next.getFullYear() + 1);
      }
      return next;
    }
    case "custom": {
      if (!recurrenceInterval) return start;
      const monthsSinceStart =
        (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      const remainder =
        ((monthsSinceStart % recurrenceInterval) + recurrenceInterval) % recurrenceInterval;
      const monthsUntilNext = remainder === 0 ? 0 : recurrenceInterval - remainder;
      let next = buildDateWithStartDay(now.getFullYear(), now.getMonth() + monthsUntilNext);
      if (next <= now) {
        next = buildDateWithStartDay(
          now.getFullYear(),
          now.getMonth() + monthsUntilNext + recurrenceInterval
        );
      }
      return next;
    }
    default:
      return start;
  }
}

export async function getUpcomingPayments(
  days: number = 14
): Promise<ApiResponse<UpcomingPayment[]>> {
  const auth = await requireAuth();
  if (auth.error) return { success: false, error: "Unauthorized" };
  const { userId } = auth;

  try {
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const payments: UpcomingPayment[] = [];

    const activeExpenses = await db
      .select({
        expense: expenses,
        category: categories,
      })
      .from(expenses)
      .leftJoin(categories, eq(expenses.categoryId, categories.id))
      .where(
        and(
          eq(expenses.userId, userId),
          sql`${expenses.endDate} IS NULL OR ${expenses.endDate} >= ${now.toISOString()}`
        )
      );

    for (const item of activeExpenses) {
      if (item.expense.recurrenceType === "once") continue;

      const nextDate = getNextPaymentDate(
        item.expense.startDate,
        item.expense.recurrenceType,
        item.expense.recurrenceInterval
      );

      if (nextDate >= now && nextDate <= endDate) {
        payments.push({
          id: item.expense.id,
          name: item.expense.name,
          amount: safeParseFloat(item.expense.amount),
          date: nextDate,
          type: "expense",
          category: item.category
            ? {
                name: item.category.name,
                icon: item.category.icon,
                color: item.category.color,
              }
            : null,
          isSubscription: item.expense.isSubscription ?? false,
        });
      }
    }

    const upcomingDailyExpenses = await db
      .select({
        dailyExpense: dailyExpenses,
        category: categories,
      })
      .from(dailyExpenses)
      .leftJoin(categories, eq(dailyExpenses.categoryId, categories.id))
      .where(
        and(
          eq(dailyExpenses.userId, userId),
          gte(dailyExpenses.date, now),
          lte(dailyExpenses.date, endDate)
        )
      );

    for (const item of upcomingDailyExpenses) {
      payments.push({
        id: item.dailyExpense.id,
        name: item.dailyExpense.description,
        amount: safeParseFloat(item.dailyExpense.amount),
        date: new Date(item.dailyExpense.date),
        type: "daily_expense",
        category: item.category
          ? {
              name: item.category.name,
              icon: item.category.icon,
              color: item.category.color,
            }
          : null,
        isSubscription: false,
      });
    }

    payments.sort((a, b) => a.date.getTime() - b.date.getTime());

    return { success: true, data: payments };
  } catch (error) {
    logger.error("Failed to fetch upcoming payments", "getUpcomingPayments", error);
    return { success: false, error: "Failed to fetch upcoming payments" };
  }
}
