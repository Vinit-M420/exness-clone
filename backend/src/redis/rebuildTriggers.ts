import { inArray } from "drizzle-orm";
import { db } from "../db";
import { orders } from "../db/schema";
import { redisClient } from "./client";

// Redis only holds a derived copy of order triggers (Postgres is the source of
// truth), so after a Redis restart/flush the trigger:/sl:/tp: sets are empty and
// nothing would ever execute. Re-populate them from Postgres, mirroring what the
// order routes add at placement time. ZADD/SADD are idempotent, so this is safe
// to run on every boot.
export async function rebuildTriggers() {
  const activeOrders = await db
    .select({
      id: orders.id,
      symbol: orders.symbol,
      side: orders.side,
      status: orders.status,
      orderType: orders.orderType,
      triggerPrice: orders.triggerPrice,
      stopLoss: orders.stopLoss,
      takeProfit: orders.takeProfit,
    })
    .from(orders)
    .where(inArray(orders.status, ["pending", "open"]));

  const symbols = new Set<string>();

  for (const order of activeOrders) {
    symbols.add(order.symbol);

    if (order.status === "pending" && order.orderType === "limit" && order.triggerPrice) {
      await redisClient.zadd(`trigger:${order.symbol}:${order.side}`, Number(order.triggerPrice), order.id);
    }
    if (order.stopLoss) {
      await redisClient.zadd(`sl:${order.symbol}:${order.side}`, Number(order.stopLoss), order.id);
    }
    if (order.takeProfit) {
      await redisClient.zadd(`tp:${order.symbol}:${order.side}`, Number(order.takeProfit), order.id);
    }
  }

  for (const symbol of symbols) {
    await redisClient.sadd("active:symbols", symbol);
  }

  console.log(`[RebuildTriggers] Restored ${activeOrders.length} orders across ${symbols.size} symbols into Redis`);
}
