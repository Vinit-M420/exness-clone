import dotenv from "dotenv";
import { db } from "../db";
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { get } from "../ws/priceStore";
import { eq, and } from "drizzle-orm"
import { HttpStatusCode } from "../schemas/http_response";
import { orders, wallet_transactions, wallets } from "../db/schema";
import { MarketOrderRequestSchema } from "../schemas/market_order";
import { subscribeSymbol, unsubscribeSymbol } from "../ws/finnhub";
import { addSymbols, removeSymbols } from "../ws/activeSymbols";
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
  if (!userId) {
    return c.json({ message: "User context missing" }, HttpStatusCode.ServerError);
  }
  const walletId = c.get("walletId");
  const balance = c.get("walletBalance");

  const allOrders = await db.select().from(orders)
    .where(
        and(
            eq(orders.userId, userId),
            eq(orders.walletId, walletId)
        )
    );

  if (allOrders.length === 0 || !allOrders) {
    return c.json({ message: "No orders found" }, HttpStatusCode.BadRequest);
  }
  else{
    return c.json({orders: allOrders, balance}, HttpStatusCode.Ok);
  }
});


/// Market Order
orderRouter.post("/market/order", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ message: "User context missing" }, HttpStatusCode.ServerError);
  }
  const walletId = c.get("walletId");
  const balance = c.get("walletBalance");
  // return c.json({ userId, walletId, balance }, HttpStatusCode.Ok);

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
  const { symbol, side, lotSize } = parsed.data;
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
  if (!userId) {
    return c.json({ message: "User context missing" }, HttpStatusCode.ServerError);
  }
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
    );
  }

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
  if (!userId) return c.json({ message: "User context missing" }, HttpStatusCode.ServerError);
  const walletId = c.get("walletId");
  // const balance = c.get("walletBalance");
  // return c.json({ userId, walletId, balance }, HttpStatusCode.Ok);

  const data = await c.req.json();
  const { symbol, side, lotSize, triggerPrice } = data;

  try{
    await db.transaction(async (tx) => {
      // const limitOrder = 
      tx.insert(orders)
      .values({ userId, walletId, symbol, side,
            status: "pending",
            orderType: "limit", 
            triggerPrice, 
            entryPrice: "0",
            lotSize, 
            marginUsed: "0",
            openedAt: null 
       }).returning();    
    }
  );
  return c.json({ message: "Limit order filed" }, HttpStatusCode.Created);
  }
  catch(e){
    return c.json({ message: "Limit order request failed", error: e }, HttpStatusCode.BadRequest);
  }


})

export default orderRouter