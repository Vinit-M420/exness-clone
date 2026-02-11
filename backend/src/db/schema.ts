import {
  pgTable, 
  index,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  unique
} from "drizzle-orm/pg-core";


export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
} ,(table) => [ index("emailIndex").on(table.email) ]
);

export const users_watchlist = pgTable("users_watchlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  symbol: text("symbol").notNull(),
  orderIndex: integer("orderIndex").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
},
  (table) => {
    return {
      userSymbolUnique: unique().on(table.userId, table.symbol),
    };
  }
);

export const wallets = pgTable("wallets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  currency: text("currency").notNull().default("USD"),
  balance: numeric("balance", { precision: 20, scale: 2 }).notNull().default("10000"),
});

export const wallet_transactions = pgTable("wallet_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletId: uuid("wallet_id").notNull().references(() => wallets.id),
  type: text("type").notNull(),  // deposit | withdrawal | trade_profit | trade_loss | fee | margin 
  // status: text("status").notNull().default("pending"),
  amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
  balanceBefore: numeric("balance_before", { precision: 20, scale: 2 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 20, scale: 2 }).notNull(),
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  walletId: uuid("wallet_id") .notNull().references(() => wallets.id),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),  // buy | sell
  status: text("status").notNull().default("pending"),
  orderType: text("order_type").notNull(),
  // triggerType: text("trigger_type"), // "SL" | "TP" | "LIMIT"
  triggerPrice: numeric("trigger_price", { precision: 20, scale: 2 }),
  stopLoss: numeric("stop_loss", { precision: 20, scale: 2 }),
  takeProfit: numeric("take_profit", { precision: 20, scale: 2 }),
  entryPrice : numeric("entry_price", { precision: 20, scale: 2 }),
  exitPrice : numeric("exit_price", { precision: 20, scale: 2 }),
  lotSize : numeric("lot_size", { precision: 20, scale: 2 }).notNull(),
  marginUsed: numeric("margin_used", { precision: 20, scale: 2 }),
  pnl: text("pnl"),
  openedAt: timestamp("opened_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}) 