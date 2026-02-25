DELETE FROM "accounts" WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "categories" WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "conversations" WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "daily_expenses" WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "documents" WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "expenses" WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "incomes" WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "transfers" WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_expenses" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "incomes" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transfers" ALTER COLUMN "user_id" SET NOT NULL;