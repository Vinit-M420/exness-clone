import dotenv from "dotenv";
import { db } from "../db";
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { get } from "../ws/priceStore";
import { eq, and } from "drizzle-orm"
import { HttpStatusCode } from "../schemas/http_response";
import { orders, wallet_transactions, wallets } from "../db/schema";
import { AddLimitsSchema, LimitOrderRequestSchema, MarketOrderRequestSchema } from "../schemas/market_order";
import { subscribeSymbol, unsubscribeSymbol } from "../ws/finnhub";
import { addSymbols, removeSymbols } from "../ws/activeSymbols";
import { redisClient } from "../redis/client";
import { price } from "../../test/mock_pricefeed";
dotenv.config()

const orderRouter = new Hono();

orderRouter.use("/*",
  jwt({ secret: process.env.JWT_SECRET! })
)

orderRouter.use("/*", async (c, next) => {
  const payload = c.get("jwtPayload");
  if (!payload?.id) return c.json({ message: "Unauthorized" }, HttpStatusCode.Unauthorized);
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

/// Get all orders
orderRouter.get("/all", async (c) => {
  const userId = c.get("userId");
  const walletId = c.get("walletId");
  const balance = c.get("walletBalance");

  const allOrders = await db.select().from(orders)
    .where(and(
            eq(orders.userId, userId),
            eq(orders.walletId, walletId)
        )
    );

  if (allOrders.length === 0) 
    return c.json({ message: "No orders found" }, HttpStatusCode.NotFound); 

  return c.json({orders: allOrders, balance}, HttpStatusCode.Ok);
});


/// Market Order
orderRouter.post("/market", async (c) => {
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
  const { symbol, side, lotSize, stopLoss, takeProfit } = parsed.data;
  const price = get(symbol);

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

  try {
  await db.transaction(async (tx) => {
    const insertedOrders = await tx
      .insert(orders)
      .values({
        userId,
        walletId,
        symbol,
        side,
        status: "open",
        orderType : "market",
        entryPrice: price.toString(),
        exitPrice: null,
        lotSize: lotSize.toString(),
        marginUsed: requiredMargin.toString(),
        stopLoss: stopLoss?.toString(),
        takeProfit: takeProfit?.toString(),
      }).returning();

    const [insertedOrder] = insertedOrders;
    if (!insertedOrder) throw new Error("Order insertion failed");   
    
    const balanceBefore = Number(balance);
    const balanceAfter = balanceBefore - requiredMargin;  
    
    await tx.insert(wallet_transactions)
      .values({ 
        walletId,
        type: "trade_margin_lock", 
        amount: requiredMargin.toString(), 
        balanceBefore: balanceBefore.toString(), 
        balanceAfter: balanceAfter.toString(), 
        referenceId: insertedOrder.id
      });

    await tx.update(wallets)
      .set({ balance: balanceAfter.toString() })
      .where(eq(wallets.id, walletId));
    await redisClient.sadd("active:symbols", symbol);
  });

  const isFirst = addSymbols(symbol);
  if (isFirst) subscribeSymbol(symbol); 

  return c.json({ 
    message: "Market order placed"}, HttpStatusCode.Created);

} catch(e) {
    console.error("Transaction error:", e);
    return c.json({ 
      message: "Error in creating the order", 
      error: e instanceof Error ? e.message : String(e)
    }, HttpStatusCode.ServerError);
  }
});

/// Order Close
orderRouter.put("/exit/:id", async (c) => {
  const userId = c.get("userId");
  const walletId = c.get("walletId");
  // const balance = c.get("walletBalance");
  // return c.json({ userId, walletId, balance }, HttpStatusCode.Ok);

  const orderId = c.req.param("id");
  const isOrderPresent = await db.select().from(orders).where(eq(orders.id, orderId)).then(res => res[0]);
  if (!isOrderPresent) return c.json({ message: "Order not found" }, HttpStatusCode.BadRequest);

  const price = get(isOrderPresent.symbol);
 
  if (!price) {
    return c.json(
      { message: "Price not available in the store for this symbol" },
      HttpStatusCode.ServiceUnavailable
  )}

  try{
  await db.transaction(async (tx) => {
    const entry = Number(isOrderPresent.entryPrice);
    const qty = Number(isOrderPresent.lotSize);
    const pnl =
      isOrderPresent.side === "buy"
        ? (price - entry) * qty
        : (entry - price) * qty;

    const closedOrder = await tx.update(orders)
      .set({ 
        status: "closed", 
        exitPrice: price.toString(), 
        pnl: pnl.toString(),
        closedAt: new Date() })
      .where(and(
              eq(orders.id, orderId),
              eq(orders.userId, userId),
              eq(orders.status, "open")
            )
        );

    if (!closedOrder) throw new Error("Order closing failed");   
    
    const walletRow = await tx
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .then(r => r[0]);

    const balanceBefore = Number(walletRow);
    const releaseAmount = Number(isOrderPresent.marginUsed) + pnl;
    const balanceAfter = balanceBefore + releaseAmount; 
    
    await tx.insert(wallet_transactions)
        .values({ walletId,
        type: "trade_close", 
        amount: releaseAmount.toString(),
        balanceBefore: balanceBefore.toString(), 
        balanceAfter: balanceAfter.toString(), 
        referenceId: orderId })   
    
    await tx.update(wallets)
          .set({ balance: balanceAfter.toString() })
         .where(eq(wallets.id, walletId));
  
  });
    const shouldUnsub = removeSymbols(isOrderPresent.symbol);
    if (shouldUnsub) unsubscribeSymbol(isOrderPresent.symbol);
    
    return c.json({ message: "Order closed" }, HttpStatusCode.Ok);

  }catch(e){
    console.error("Transaction error:", e);
    return c.json({ message: "Error in closing the order", 
      error: e instanceof Error? e.message : String(e) }, HttpStatusCode.ServerError);
  }
});

// Limit Order
orderRouter.post("/limit", async (c) => {
  const userId : string = c.get("userId");
  const walletId = c.get("walletId");
  const data = await c.req.json();

  const parsed = LimitOrderRequestSchema.safeParse(data);
  if (!parsed.success) {
    return c.json({ message: "Invalid order request", errors: parsed.error, },
      HttpStatusCode.BadRequest);
  }
  const { symbol, side, lotSize, triggerPrice, stopLoss, takeProfit } = parsed.data;
  // const price = get(symbol);

  if (!price) 
    return c.json({ message: "Price not available in the store for this symbol" }, 
      HttpStatusCode.ServiceUnavailable);
  
  // if (side === 'buy' && price > triggerPrice) {
  //   return c.json({ message: "Trigger price is higher than the current price" }, 
  //     HttpStatusCode.BadRequest);
  // }
  // if (side ==='sell' && price < triggerPrice) {
  //   return c.json({ message: "Trigger price is lower than the current price" }, 
  //     HttpStatusCode.BadRequest);
  // }

  try{
    await db.transaction(async (tx) => {
    const [insertedOrder] = await tx.insert(orders).values({
      userId: userId as string,
      walletId: walletId as string,
      symbol,
      side,
      status: "pending",
      orderType: "limit",
      triggerPrice: triggerPrice.toString(),
      entryPrice: null,
      lotSize: lotSize.toString(),
      marginUsed: null,
      openedAt: null,
      stopLoss : stopLoss?.toString() ?? null,
      takeProfit: takeProfit?.toString()?? null,
    }).returning({ id: orders.id });

    if (!insertedOrder) if (!insertedOrder) throw new Error("Limit order creation failed");
    await redisClient.sadd("active:symbols", symbol);
    await redisClient.zadd(`trigger:${symbol}:${side}`, Number(triggerPrice), insertedOrder.id);
    
    if (stopLoss) {
        await redisClient.zadd(`sl:${symbol}:${side.toUpperCase()}`,
          Number(stopLoss),
          insertedOrder.id
        );
      }
    if (takeProfit) {
        await redisClient.zadd(
          `tp:${symbol}:${side.toUpperCase()}`,
          Number(takeProfit),
          insertedOrder.id
        );
      }
  }
  );

  return c.json({ message: "Limit order filed" }, HttpStatusCode.Created);
  }
  catch(e){
    return c.json({ message: "Limit order request failed", error: e }, HttpStatusCode.BadRequest);
  }
})

// Add Stop Loss and/or Take Profit or Edit trigger Price
orderRouter.put("/edit/:id", async (c) => {
  const userId = c.get("userId");
  const orderId = c.req.param("id");
  const isOrderPresent = await db.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .then(res => res[0]);
  if (!isOrderPresent) 
    return c.json({ message: "Order not found" }, HttpStatusCode.NotFound);
  if (isOrderPresent.status !== "open")
      return c.json({ message: "SL/TP allowed only for open orders" }, HttpStatusCode.BadRequest);

  const data = await c.req.json();
  const parsed = AddLimitsSchema.safeParse(data);
  if (!parsed.success) {
    return c.json({ message: "No given limits to add", errors: parsed.error, },
      HttpStatusCode.BadRequest);
  }

  const entryPrice = Number(isOrderPresent.entryPrice);
  const side = isOrderPresent.side;
  const symbol = isOrderPresent.symbol;
  const stopLoss = parsed.data.stopLoss;
  const takeProfit = parsed.data.takeProfit;

  if (side === "BUY") {
    if (stopLoss && stopLoss >= entryPrice)
      return c.json({ message: "Invalid stop loss:" }, 400);

    if (takeProfit && takeProfit <= entryPrice)
      return c.json({ message: "Invalid take profit" }, 400);
  }

  try{
    const updatedOrder = await db.update(orders)
     .set({ 
        stopLoss : stopLoss?.toString()?? null,
        takeProfit: takeProfit?.toString()?? null,})
    .where(and(
            eq(orders.id, orderId),
            eq(orders.userId, userId),
        ))
   .returning({ id: orders.id });

    if (updatedOrder.length === 0) 
      return c.json({message: "Order edit failed"}, HttpStatusCode.BadRequest);
    
    await redisClient.zrem(`sl:${symbol}:${side}`, orderId);
    await redisClient.zrem(`tp:${symbol}:${side}`, orderId);

    // if (stopLoss == null && takeProfit == null) {
    //   await redisClient.srem("limit:orders", orderId);
    // } else {
    //   await redisClient.sadd("limit:orders", orderId);
    // }

    if (stopLoss !== null)
      await redisClient.zadd(`sl:${isOrderPresent.symbol}:${isOrderPresent.side}`, stopLoss, orderId)
      console.log(`SL: ${orderId} ${stopLoss}`)

    if (takeProfit !== null)
      await redisClient.zadd(`tp:${isOrderPresent.symbol}:${isOrderPresent.side}`, takeProfit, orderId)
      console.log(`TP: ${orderId} ${takeProfit}`)

    // if (stopLoss === null)
    //   await redisClient.zrem(`sl:${isOrderPresent.symbol}:${side}`, orderId);
    // if (takeProfit === null)
    //   await redisClient.zrem(`tp:${isOrderPresent.symbol}:${side}`, orderId);

    return c.json({ message: "Order edited" }, HttpStatusCode.Ok);
  
} catch(e){
  console.error("Transaction error:", e);
  return c.json({ message: "Error in editing the order", 
    error: e instanceof Error? e.message : String(e) }, 
    HttpStatusCode.ServerError);
}
});


export default orderRouter