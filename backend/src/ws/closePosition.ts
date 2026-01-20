import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { orders, wallet_transactions, wallets } from "../db/schema";

// ========== CLOSE POSITION (SL/TP Hit) ==========
export async function closePosition(
  orderId: string,
  symbol: string,
  closePrice: number,
  reason: "stop_loss" | "take_profit"
) {
  console.log(`[ClosePosition] Closing order ${orderId} @ ${closePrice} - Reason: ${reason}`);

  // Fetch order from database
  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .then((res) => res[0]);

  if (!order) {
    console.log(`[ClosePosition] ❌ Order ${orderId} not found in DB`);
    return;
  }

  console.log(`[ClosePosition] Order found - Status: ${order.status}, Entry: ${order.entryPrice}`);

  // Validate order is open
  if (order.status !== "open") {
    console.log(`[ClosePosition] ❌ Order is not open: ${order.status}`);
    return;
  }

  const entryPrice = Number(order.entryPrice);
  const lotSize = Number(order.lotSize);
  const marginUsed = Number(order.marginUsed);

  // Calculate PnL
  let pnl = 0;
  if (order.side === "buy") {
    pnl = (closePrice - entryPrice) * lotSize;
  } else if (order.side === "sell") {
    pnl = (entryPrice - closePrice) * lotSize;
  }

  const finalAmount = marginUsed + pnl; // Return margin + profit/loss

  console.log(`[ClosePosition] Entry: ${entryPrice}, Close: ${closePrice}, PnL: ${pnl}, Final: ${finalAmount}`);

  // Execute close in transaction
  await db.transaction(async (tx) => {
    // Get wallet
    const wallet = await tx
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.id, order.walletId))
      .then((res) => res[0]);

    if (!wallet) {
      console.log(`[ClosePosition] ❌ Wallet not found`);
      return;
    }

    // Update order status to closed
    const updated = await tx
      .update(orders)
      .set({
        status: "closed",
        exitPrice: closePrice.toString(),
        closedAt: new Date(),
        pnl: pnl.toString(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, "open")))
      .returning({ id: orders.id });

    if (updated.length === 0) {
      console.log(`[ClosePosition] ⚠️ Order ${orderId} already closed or doesn't exist`);
      return;
    }

    // Record wallet transaction - release margin + PnL
    const balanceBefore = wallet.balance;
    const balanceAfter = Number(balanceBefore) + finalAmount;

    await tx.insert(wallet_transactions).values({
      walletId: order.walletId,
      type: reason === "stop_loss" ? "trade_stop_loss" : "trade_take_profit",
      amount: finalAmount.toString(),
      balanceBefore: balanceBefore.toString(),
      balanceAfter: balanceAfter.toString(),
      referenceId: order.id,
    });

    // Update wallet balance
    await tx
      .update(wallets)
      .set({ balance: balanceAfter.toString() })
      .where(eq(wallets.id, order.walletId));

    console.log(`[ClosePosition] ✅✅✅ Order ${orderId} closed! PnL: ${pnl}, New Balance: ${balanceAfter}`);
  });
}