import {
  pgTable,
  uuid,
  text,
  decimal,
  timestamp,
  integer,
  pgEnum,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const accountTypeEnum = pgEnum("account_type", ["checking", "savings", "etf"]);
export const recurrenceTypeEnum = pgEnum("recurrence_type", [
  "once",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "semiannual",
  "yearly",
  "custom",
]);
export const incomeRecurrenceTypeEnum = pgEnum("income_recurrence_type", [
  "once",
  "monthly",
  "yearly",
]);
export const transferRecurrenceTypeEnum = pgEnum("transfer_recurrence_type", [
  "once",
  "monthly",
  "quarterly",
  "yearly",
]);

// Auth.js user table - extended with Auth.js adapter fields
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  name: text("name"),
  password: text("password"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Auth.js accounts table (OAuth provider linking)
// Prefixed with "auth_" to avoid conflict with financial accounts table
export const authAccounts = pgTable("auth_accounts", {
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

// Auth.js sessions table (for database session strategy - future-proofing)
export const authSessions = pgTable("auth_sessions", {
  sessionToken: text("session_token").notNull().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// Auth.js verification tokens (for password reset / magic links)
export const authVerificationTokens = pgTable(
  "auth_verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// User relations - enables querying user's data with Drizzle relational queries
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  categories: many(categories),
  expenses: many(expenses),
  incomes: many(incomes),
  dailyExpenses: many(dailyExpenses),
  transfers: many(transfers),
  documents: many(documents),
  conversations: many(conversations),
}));

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").default("EUR").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  recurrenceType: recurrenceTypeEnum("recurrence_type").notNull(),
  recurrenceInterval: integer("recurrence_interval"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isSubscription: boolean("is_subscription").default(false).notNull(),
  info: text("info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const incomes = pgTable("incomes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  recurrenceType: incomeRecurrenceTypeEnum("recurrence_type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  info: text("info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyExpenses = pgTable("daily_expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  info: text("info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transfers = pgTable("transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sourceAccountId: uuid("source_account_id")
    .references(() => accounts.id, { onDelete: "cascade" })
    .notNull(),
  targetAccountId: uuid("target_account_id")
    .references(() => accounts.id, { onDelete: "cascade" })
    .notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  recurrenceType: transferRecurrenceTypeEnum("recurrence_type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "cascade" }),
  dailyExpenseId: uuid("daily_expense_id").references(() => dailyExpenses.id, {
    onDelete: "cascade",
  }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  expenses: many(expenses),
  incomes: many(incomes),
  dailyExpenses: many(dailyExpenses),
  outgoingTransfers: many(transfers, { relationName: "sourceAccount" }),
  incomingTransfers: many(transfers, { relationName: "targetAccount" }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  expenses: many(expenses),
  dailyExpenses: many(dailyExpenses),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [expenses.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [expenses.categoryId],
    references: [categories.id],
  }),
  documents: many(documents),
}));

export const incomesRelations = relations(incomes, ({ one }) => ({
  user: one(users, {
    fields: [incomes.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [incomes.accountId],
    references: [accounts.id],
  }),
}));

export const dailyExpensesRelations = relations(dailyExpenses, ({ one, many }) => ({
  user: one(users, {
    fields: [dailyExpenses.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [dailyExpenses.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [dailyExpenses.categoryId],
    references: [categories.id],
  }),
  documents: many(documents),
}));

export const transfersRelations = relations(transfers, ({ one }) => ({
  user: one(users, {
    fields: [transfers.userId],
    references: [users.id],
  }),
  sourceAccount: one(accounts, {
    fields: [transfers.sourceAccountId],
    references: [accounts.id],
    relationName: "sourceAccount",
  }),
  targetAccount: one(accounts, {
    fields: [transfers.targetAccountId],
    references: [accounts.id],
    relationName: "targetAccount",
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  expense: one(expenses, {
    fields: [documents.expenseId],
    references: [expenses.id],
  }),
  dailyExpense: one(dailyExpenses, {
    fields: [documents.dailyExpenseId],
    references: [dailyExpenses.id],
  }),
}));

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull().default("Neuer Chat"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));
