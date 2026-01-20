import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { orders, wallet_transactions, wallets } from "../db/schema";

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

  // Validate trigger price condition
  const triggerPrice = Number(order.triggerPrice);
  if (side === "buy" && currentPrice < triggerPrice) {
    console.log(`[OpenPosition] ❌ BUY price not reached: ${currentPrice} < ${triggerPrice}`);
    return;
  }
  if (side === "sell" && currentPrice > triggerPrice) {
    console.log(`[OpenPosition] ❌ SELL price not reached: ${currentPrice} > ${triggerPrice}`);
    return;
  }

  // Check wallet balance
  const balance = await db
    .select({ balance: wallets.balance })
    .from(wallets)
    .where(eq(wallets.id, order.walletId))
    .then((res) => res[0]);

  if (!balance) {
    console.log(`[OpenPosition] ❌ Wallet ${order.walletId} not found`);
    return;
  }

  // Calculate required margin
  const leverage = 10;
  const positionVal = currentPrice * Number(order.lotSize);
  const requiredMargin = positionVal / leverage;

  console.log(`[OpenPosition] Position value: ${positionVal}, Required margin: ${requiredMargin}, Available: ${balance.balance}`);

  if (Number(balance.balance) < requiredMargin) {
    console.error(`[OpenPosition] ❌ Insufficient balance: ${balance.balance} < ${requiredMargin}`);
    throw new Error("Insufficient balance");
  }

  console.log(`[OpenPosition] 💰 Balance check passed, executing transaction...`);

  // Execute order in transaction
  await db.transaction(async (tx) => {
    // Re-check wallet balance in transaction
    const wallet = await tx
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.id, order.walletId))
      .then((res) => res[0]);

    if (!wallet) {
      console.log(`[OpenPosition] ❌ Wallet not found in transaction`);
      return;
    }

    if (Number(wallet.balance) < requiredMargin) {
      console.error(`[OpenPosition] ❌ Insufficient balance in transaction`);
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
      console.log(`[OpenPosition] ⚠️ Order ${orderId} already processed or doesn't exist`);
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

    console.log(`[OpenPosition] ✅✅✅ Order ${orderId} opened! Entry: ${currentPrice}, Margin: ${requiredMargin}`);
  });
}
