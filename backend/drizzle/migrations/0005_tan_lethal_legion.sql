ALTER TABLE "orders" ALTER COLUMN "pnl" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_type" text NOT NULL;