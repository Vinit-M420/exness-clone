import {
  pgTable, 
  index,
  uuid,
  text,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";


export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
} ,table => {
  return {
    emailIndex: index("emailIndex").on(table.email),
  }
}
);

export const wallets = pgTable("wallets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  balance: numeric("balance", { precision: 20, scale: 2 }).notNull().default("10000"),
});


export const wallet_transactions = pgTable("wallet_transactions", {
  transaction_id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  walletId: uuid("user_id").notNull().unique(),
  status: text("status").notNull().default("pending"),
  amount: numeric("amount"),
  balanceAfter: numeric("balance_after"),
  createAt: timestamp("created_at").defaultNow(),
});