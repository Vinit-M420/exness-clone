ALTER TABLE "orders" ADD COLUMN "client_order_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_client_order_id_unique" UNIQUE("user_id","client_order_id");