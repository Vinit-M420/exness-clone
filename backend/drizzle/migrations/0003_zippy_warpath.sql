CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"entry_price" numeric(20, 2) NOT NULL,
	"exit_price" numeric(20, 2),
	"lot_size" numeric(20, 2) NOT NULL,
	"margin_used" numeric(20, 2) NOT NULL,
	"pnl" numeric(20, 2),
	"opened_at" timestamp DEFAULT now(),
	"closed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "wallet_transactions" DROP CONSTRAINT "wallet_transactions_id_wallets_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" DROP COLUMN "status";