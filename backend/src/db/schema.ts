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
},table => {
  return {
    emailIndex: index("emailIndex").on(table.email),
  }
}
);

export const wallets = pgTable("wallets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  balance: numeric("balance", { precision: 20, scale: 2 })
    .notNull()
    .default("10000"),
});
