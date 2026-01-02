/* eslint-disable @typescript-eslint/no-unused-vars */
import dotenv from "dotenv";
import { db } from "../db";
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { HttpStatusCode } from "../schemas/http_response";
import { wallets } from "../db/schema";
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

  try{
      
      // db.insert(orders)
      // .values({ userId: userId, walletId: walletId,  })
  }
  catch(e){
    
  }
});