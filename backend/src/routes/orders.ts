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
// import { price } from "../../test/mock_pricefeed";
import { checker } from "../funcs/checker";

const orderRouter = new Hono();

orderRouter.use("/*",
  jwt({ secret: process.env.JWT_SECRET! , alg: "HS256",}),
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
    return c.json({ message: "No orders found" }, HttpStatusCode.Ok); 

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
  )}

  const validationError = checker(side, Number(stopLoss), Number(takeProfit), Number(price));
  if (validationError) 
      return c.json({ message: validationError },HttpStatusCode.BadRequest);

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
        createdAt: new Date(),
      }).returning({ id: orders.id });

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
      
      if (stopLoss) {
        await redisClient.zadd(`sl:${symbol}:${side}`,
          Number(stopLoss),
          insertedOrder.id
      )}
      if (takeProfit) {
        await redisClient.zadd(
          `tp:${symbol}:${side}`,
          Number(takeProfit),
          insertedOrder.id
      )}
      const isFirst = addSymbols(symbol);
      if (isFirst) subscribeSymbol(symbol); 
  });

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
  const price = get(symbol);

  if (!price) 
    return c.json({ message: "Price not available in the store for this symbol" }, 
      HttpStatusCode.ServiceUnavailable);

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
      createdAt: new Date(),
    }).returning({ id: orders.id });

    if (!insertedOrder) if (!insertedOrder) throw new Error("Limit order creation failed");
    await redisClient.sadd("active:symbols", symbol);
    await redisClient.zadd(`trigger:${symbol}:${side}`, Number(triggerPrice), insertedOrder.id);
    
    if (stopLoss) {
        await redisClient.zadd(`sl:${symbol}:${side}`,
          Number(stopLoss),
          insertedOrder.id
    )}
    if (takeProfit) {
        await redisClient.zadd(`tp:${symbol}:${side}`,
          Number(takeProfit),
          insertedOrder.id
    )}
  });
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

  const order = await db.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .then(res => res[0]);

  if (!order)
    return c.json({ message: "Order not found" }, 404);

  if (order.status === "closed")
    return c.json({ message: "Cannot edit closed order" }, HttpStatusCode.BadRequest);

  const body = await c.req.json();
  const parsed = AddLimitsSchema.safeParse(body);
  if (!parsed.success) return c.json({ message: "Invalid input", errors: parsed.error }, HttpStatusCode.BadRequest);

  const { stopLoss, takeProfit, triggerPrice } = parsed.data;
  const entryPrice = Number(order.entryPrice);
  const side = order.side;
  const status = order.status;

  // OPEN ORDER VALIDATION
  if (status === "open") {

    if (side === "buy") {
      if (stopLoss && stopLoss >= entryPrice)
        return c.json({ message: "SL must be below entry for BUY" }, HttpStatusCode.BadRequest);

      if (takeProfit && takeProfit <= entryPrice)
        return c.json({ message: "TP must be above entry for BUY" }, HttpStatusCode.BadRequest);
    }

    if (side === "sell") {
      if (stopLoss && stopLoss <= entryPrice)
        return c.json({ message: "SL must be above entry for SELL" }, HttpStatusCode.BadRequest);

      if (takeProfit && takeProfit >= entryPrice)
        return c.json({ message: "TP must be below entry for SELL" }, HttpStatusCode.BadRequest);
    }
  }

  //  PENDING ORDER VALIDATION
  if (status === "pending") {
    if (triggerPrice !== undefined) {
    if (triggerPrice <= 0)
      return c.json({ message: "Invalid trigger price" }, HttpStatusCode.BadRequest);
    }
  } 

  try {

    const updated = await db.update(orders)
      .set({
        stopLoss: stopLoss?.toString() ?? null,
        takeProfit: takeProfit?.toString() ?? null,
        triggerPrice: triggerPrice?.toString() ?? order.triggerPrice
      })
      .where(and(
        eq(orders.id, orderId),
        eq(orders.userId, userId),
      ))
      .returning({ id: orders.id });

    if (updated.length === 0)
      return c.json({ message: "Edit failed" }, HttpStatusCode.BadRequest);

    // Remove old limits from redis
    await redisClient.zrem(`sl:${order.symbol}:${side}`, orderId);
    await redisClient.zrem(`tp:${order.symbol}:${side}`, orderId);

    // Add new limits
    if (stopLoss !== null && stopLoss !== undefined)
      await redisClient.zadd(`sl:${order.symbol}:${side}`, stopLoss, orderId);

    if (takeProfit !== null && takeProfit !== undefined)
      await redisClient.zadd(`tp:${order.symbol}:${side}`, takeProfit, orderId);

    return c.json({ message: "Order edited successfully" }, 200);

  } catch (e) {
    console.error("Edit error:", e);
    return c.json({
      message: "Internal server error",
      error: e instanceof Error ? e.message : String(e)
    }, 500);
  }
});

orderRouter.delete("/order/:id", async (c) => {
  const userId = c.get("userId");
  const orderId = c.req.param("id");
  const isOrderPresent = await db.select().from(orders)
   .where(and(eq(orders.id, orderId), eq(orders.userId, userId))).then(res => res[0]);
  
  if (!isOrderPresent) return c.json({ message: "Order not found" }, HttpStatusCode.NotFound);
  if (isOrderPresent.status !== "pending")
    return c.json({ message: "Only pending Order can be deleted" }, HttpStatusCode.BadRequest);

  try{
    await db.delete(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));

    await redisClient.zrem(`trigger:${isOrderPresent.symbol}:${isOrderPresent.side}`, orderId);

    return c.json({ message: "Order deleted" }, HttpStatusCode.Ok);
  }
  catch(e){
    console.error(e);
    return c.json({ message: "Order deletion failed" }, HttpStatusCode.BadRequest);
  }
});

orderRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const orderId = c.req.param("id");
  const isOrderPresent = await db.select().from(orders)
   .where(and(eq(orders.id, orderId), eq(orders.userId, userId))).then(res => res[0]);
  
  if (!isOrderPresent) return c.json({ message: "Order not found" }, HttpStatusCode.NotFound);
  return c.json(isOrderPresent, HttpStatusCode.Ok);
});
 
export default orderRouter