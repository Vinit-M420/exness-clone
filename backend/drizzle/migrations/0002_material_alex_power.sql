CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"balance_before" numeric(20, 2) NOT NULL,
	"balance_after" numeric(20, 2) NOT NULL,
	"reference_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_id_wallets_id_fk" FOREIGN KEY ("id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;