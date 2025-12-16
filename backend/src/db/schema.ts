import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  balance: numeric("balance", { precision: 20, scale: 2 })
    .notNull()
    .default("10000"),
});
