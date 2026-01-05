import dotenv from "dotenv";
import { db } from "../db";
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { HttpStatusCode } from "../schemas/http_response";
import { orders, wallet_transactions, wallets } from "../db/schema";
import { eq } from "drizzle-orm"
import { MarketOrderRequestSchema } from "../schemas/market_order";
import { priceStore } from "../ws/priceStore";
dotenv.config()

const orderRouter = new Hono();

orderRouter.use("/*",
  jwt({
    secret: process.env.JWT_SECRET!,
  })
)

orderRouter.use("/*", async (c, next) => {
  const payload = c.get("jwtPayload");
  if (!payload) return c.json({ message: "Unauthorized" }, HttpStatusCode.Unauthorized);
  const userId = payload.id;
  const wallet = await db
    .select({ id: wallets.id, balance: wallets.balance })
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .then(res => res[0]);

  if (!wallet) 
    return c.json({ message: "Wallet not found" }, HttpStatusCode.BadRequest);
  
  c.set("userId", userId);
  c.set("walletId", wallet.id);
  c.set("walletBalance", wallet.balance);

  await next();
  
})

/// Market Order
orderRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const walletId = c.get("walletId");
  const balance = c.get("walletBalance");

  const order = await c.req.json();
  const parsed = MarketOrderRequestSchema.safeParse(order);
  
  if (!parsed.success) {
    return c.json({
        message: "Invalid order request",
        errors: parsed.error,
      },
      HttpStatusCode.BadRequest
    );
  }
  const { symbol, side, orderType, lotSize } = parsed.data;
  const price = priceStore.get(symbol);

  if (!price) {
    return c.json(
      { message: "Price not available in the store for this symbol" },
      HttpStatusCode.ServiceUnavailable
    );
  }

  const leverage = 10 // hardcoded for now
  const positionVal = price * lotSize;
  const requiredMargin = positionVal / leverage

  if (Number(balance) < requiredMargin) {
    return c.json({ message: "Insufficient balance", balance, requiredMargin }, 
      HttpStatusCode.UnprocessableEntity);
  }

  try{
    await db.transaction(async (tx) => {
      const insertedOrders = await tx
        .insert(orders)
        .values({
          userId,
          walletId,
          symbol,
          side,
          status: "open",
          orderType,
          entryPrice: price.toString(),
          exitPrice: null,
          lotSize: lotSize.toString(),
          marginUsed: requiredMargin.toString(),
        }).returning();

      if (insertedOrders.length === 0) {
        throw new Error("Order insertion failed");
      }
      
      const balanceBefore = Number(balance);
      const balanceAfter = balanceBefore - requiredMargin;  
      
      await tx.insert(wallet_transactions)
        .values({ walletId,
          type: "trade_margin_lock", 
          amount: requiredMargin.toString(), 
          balanceBefore: balanceBefore.toString(), 
          balanceAfter: balanceAfter.toString(), 
          referenceId: order.id });

      await tx.update(wallets)
          .set({balance: balanceAfter.toString()})
          .where(eq(wallets.id, walletId))

    });
   
    return c.json({ message: "Market order placed", order: order.id },
      HttpStatusCode.Created
    );

  }
  catch(e){
    return c.json({ message: "Error in creating the order", error: e}, 
      HttpStatusCode.ServerError
    );
  }
});