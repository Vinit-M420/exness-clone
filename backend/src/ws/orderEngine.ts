import { db } from "../db";
import { eq, and } from "drizzle-orm"
import { orders, wallet_transactions, wallets } from "../db/schema";


export async function OrderEngine(orderId : string, currentPrice : number){

    const order = await db.select().from(orders).where(eq(orders.id, orderId)).then(res => res[0]);
    if (!order) return;
    if (order.status !== "pending" || order.orderType !== "limit") return;
    if (order.side !== "buy" && order.side !== "sell") return;

    // const balance  = await db.select({ balance: wallets.balance })
    //     .from(wallets).where(eq(wallets.id, order.walletId)).then(res => res[0]);
    // if (Number(balance?.balance) < requiredMargin) throw new Error("Insufficient balance");
    // if (!balance) return;

    const leverage = 10 // hardcoded for now
    const positionVal = currentPrice * Number(order.lotSize);
    const requiredMargin = positionVal / leverage

    await db.transaction(async (tx) => {
        const wallet  = await db.select({ balance: wallets.balance })
            .from(wallets).where(eq(wallets.id, order.walletId)).then(res => res[0]);

        if (!wallet) return;
        if (Number(wallet.balance) < requiredMargin) throw new Error("Insufficient balance");   

        const updated = await tx.update(orders).set({ 
            status: "open", 
            entryPrice: currentPrice.toString(),
            marginUsed: requiredMargin.toString(),
            openedAt: new Date(),
            })
            .where(and(
            eq(orders.id, orderId),
            eq(orders.status, "pending")))
            .returning({ id: orders.id });
        
        if (updated.length === 0) return;

        const balanceBefore = wallet?.balance;
        const balanceAfter = Number(balanceBefore) - requiredMargin;

        await tx.insert(wallet_transactions)
        .values({ 
            walletId : order.walletId,
            type: "trade_margin_lock", 
            amount: requiredMargin.toString(), 
            balanceBefore: balanceBefore.toString(), 
            balanceAfter: balanceAfter.toString(), 
            referenceId: order.id
        });

        await tx.update(wallets).set({ balance: balanceAfter.toString() })
            .where(eq(wallets.id, order.walletId));
            
    })

}