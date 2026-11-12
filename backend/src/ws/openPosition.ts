import { db } from "../db";
import { eq, and, gte, sql } from "drizzle-orm";
import { orders, wallet_transactions, wallets } from "../db/schema";
import { redisClient } from "../redis/client";

// ========== OPEN POSITION (Trigger Price Hit) ==========
export async function openPosition(
  orderId: string,
  symbol: string,
  side: string,
  currentPrice: number
) {
  console.log(`[OpenPosition] Processing order ${orderId} - ${side} @ ${currentPrice}`);

  // Fetch order from database
  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .then((res) => res[0]);

  if (!order) {
    console.log(`[OpenPosition] ❌ Order ${orderId} not found in DB`);
    return;
  }

  console.log(`[OpenPosition] Order found - Status: ${order.status}, Type: ${order.orderType}`);

  // Validate order status and type
  if (order.status !== "pending" || order.orderType !== "limit") {
    console.log(`[OpenPosition] ❌ Invalid order status/type: ${order.status}/${order.orderType}`);
    return;
  }

  if (order.side !== "buy" && order.side !== "sell") {
    console.log(`[OpenPosition] ❌ Invalid order side: ${order.side}`);
    return;
  }

  // Validate trigger price condition (must match priceWatcher's ranges):
  // buy limit fills once price drops to/below trigger, sell limit once it rises to/above
  const triggerPrice = Number(order.triggerPrice);
  if (side === "buy" && currentPrice > triggerPrice) {
    console.log(`[OpenPosition] ❌ BUY price not reached: ${currentPrice} > ${triggerPrice}`);
    return;
  }
  if (side === "sell" && currentPrice < triggerPrice) {
    console.log(`[OpenPosition] ❌ SELL price not reached: ${currentPrice} < ${triggerPrice}`);
    return;
  }

  // Calculate required margin
  const leverage = 10;
  const positionVal = currentPrice * Number(order.lotSize);
  const requiredMargin = positionVal / leverage;

  console.log(`[OpenPosition] Position value: ${positionVal}, Required margin: ${requiredMargin}`);

  // Execute order in transaction
  let opened = false;
  await db.transaction(async (tx) => {
    // Update order status from pending to open
    const updated = await tx
      .update(orders)
      .set({
        status: "open",
        entryPrice: currentPrice.toString(),
        marginUsed: requiredMargin.toString(),
        openedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
      .returning({ id: orders.id });

    if (updated.length === 0) {
      console.log(`[OpenPosition] ⚠️ Order ${orderId} already processed or doesn't exist`);
      return;
    }

    // Atomic conditional debit: only succeeds if the balance still covers the
    // margin at write time (throwing rolls back the order status update too)
    const [debited] = await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} - ${requiredMargin}` })
      .where(and(
        eq(wallets.id, order.walletId),
        gte(wallets.balance, requiredMargin.toString())
      ))
      .returning({ balance: wallets.balance });

    if (!debited) {
      console.error(`[OpenPosition] ❌ Insufficient balance (or wallet ${order.walletId} not found)`);
      throw new Error("Insufficient balance");
    }

    // Record wallet transaction
    const balanceAfter = Number(debited.balance);
    const balanceBefore = balanceAfter + requiredMargin;

    await tx.insert(wallet_transactions).values({
      walletId: order.walletId,
      type: "trade_margin_lock",
      amount: requiredMargin.toString(),
      balanceBefore: balanceBefore.toString(),
      balanceAfter: balanceAfter.toString(),
      referenceId: order.id,
    });

    console.log(`[OpenPosition] ✅✅✅ Order ${orderId} opened! Entry: ${currentPrice}, Margin: ${requiredMargin}`);
    opened = true;
  });

  // SL/TP only start watching once the position is actually open
  if (opened) {
    if (order.stopLoss)
      await redisClient.zadd(`sl:${symbol}:${order.side}`, Number(order.stopLoss), orderId);
    if (order.takeProfit)
      await redisClient.zadd(`tp:${symbol}:${order.side}`, Number(order.takeProfit), orderId);
  }
}
