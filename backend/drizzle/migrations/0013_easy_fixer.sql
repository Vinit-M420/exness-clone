ALTER TABLE "users_watchlist" ALTER COLUMN "orderIndex" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "users_watchlist" ALTER COLUMN "orderIndex" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users_watchlist" ADD CONSTRAINT "users_watchlist_user_id_symbol_unique" UNIQUE("user_id","symbol");