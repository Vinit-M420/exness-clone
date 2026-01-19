import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { orders, wallet_transactions, wallets } from "../db/schema";
// import { redisClient } from "../redis/client";

export async function OrderEngine(
  orderId: string,
  symbol: string,
  side: string,
  currentPrice: number
) {
  console.log(`[OrderEngine] Processing order ${orderId} - ${side} @ ${currentPrice}`);

  // // Check if order exists in trigger set 
  // const triggerPrice = await redisClient.zscore(
  //   `trigger:${symbol}:${side.toLowerCase()}`,
  //   orderId
  // );

  // if (!triggerPrice) {
  //   console.log(`[OrderEngine] ❌ No trigger price found for ${orderId} in trigger:${symbol}:${side}`);
  //   return;
  // }

  // console.log(`[OrderEngine] Found trigger price: ${triggerPrice}`);

  // // Validate trigger conditions
  // if (side === "buy" && currentPrice < triggerPrice) {
  //   console.log(`[OrderEngine] ❌ BUY price not reached: ${currentPrice} < ${triggerPrice}`);
  //   return;
  // }
  // if (side === "sell" && currentPrice > triggerPrice) {
  //   console.log(`[OrderEngine] ❌ SELL price not reached: ${currentPrice} > ${triggerPrice}`);
  //   return;
  // }

  // console.log(`[OrderEngine] ✅ Trigger condition met, fetching order from DB...`);

  // Fetch order from database
  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .then((res) => res[0]);

  if (!order) {
    console.log(`[OrderEngine] ❌ Order ${orderId} not found in DB`);
    return;
  }

  console.log(`[OrderEngine] Order found - Status: ${order.status}, Type: ${order.orderType}`);

  // Validate order status and type
  if (order.status !== "pending" || order.orderType !== "limit") {
    console.log(`[OrderEngine] ❌ Invalid order status/type: ${order.status}/${order.orderType}`);
    return;
  }

  if (order.side !== "buy" && order.side !== "sell") {
    console.log(`[OrderEngine] ❌ Invalid order side: ${order.side}`);
    return;
  }

  // Check wallet balance
  const balance = await db
    .select({ balance: wallets.balance })
    .from(wallets)
    .where(eq(wallets.id, order.walletId))
    .then((res) => res[0]);

  if (!balance) {
    console.log(`[OrderEngine] ❌ Wallet ${order.walletId} not found`);
    return;
  }

  // Calculate required margin
  const leverage = 10;
  const positionVal = currentPrice * Number(order.lotSize);
  const requiredMargin = positionVal / leverage;

  console.log(`[OrderEngine] Position value: ${positionVal}, Required margin: ${requiredMargin}, Available: ${balance.balance}`);

  if (Number(balance.balance) < requiredMargin) {
    console.error(`[OrderEngine] ❌ Insufficient balance: ${balance.balance} < ${requiredMargin}`);
    throw new Error("Insufficient balance");
  }

  console.log(`[OrderEngine] 💰 Balance check passed, executing transaction...`);

  // Execute order in transaction
  await db.transaction(async (tx) => {
    // Re-check wallet balance in transaction
    const wallet = await tx
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.id, order.walletId))
      .then((res) => res[0]);

    if (!wallet) {
      console.log(`[OrderEngine] ❌ Wallet not found in transaction`);
      return;
    }

    if (Number(wallet.balance) < requiredMargin) {
      console.error(`[OrderEngine] ❌ Insufficient balance in transaction`);
      throw new Error("Insufficient balance");
    }

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
      console.log(`[OrderEngine] ⚠️ Order ${orderId} already processed or doesn't exist`);
      return;
    }

    // Record wallet transaction
    const balanceBefore = wallet.balance;
    const balanceAfter = Number(balanceBefore) - requiredMargin;

    await tx.insert(wallet_transactions).values({
      walletId: order.walletId,
      type: "trade_margin_lock",
      amount: requiredMargin.toString(),
      balanceBefore: balanceBefore.toString(),
      balanceAfter: balanceAfter.toString(),
      referenceId: order.id,
    });

    // Update wallet balance
    await tx
      .update(wallets)
      .set({ balance: balanceAfter.toString() })
      .where(eq(wallets.id, order.walletId));

    console.log(`[OrderEngine] ✅✅✅ Order ${orderId} executed successfully! Entry: ${currentPrice}, Margin: ${requiredMargin}`);
  });
}