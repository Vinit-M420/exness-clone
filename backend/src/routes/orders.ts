import dotenv from "dotenv";
import { db } from "../db";
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { HttpStatusCode } from "../schemas/http_response";
import { orders, wallets } from "../db/schema";
import { eq, desc } from "drizzle-orm"
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

  
  try{
      // db.insert(orders)
      // .values({ userId: userId, walletId: walletId,  })
  }
  catch(e){
    
  }
});