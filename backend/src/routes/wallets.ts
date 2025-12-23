import dotenv from "dotenv";
import { db } from "../db";
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { HttpStatusCode } from "../schemas/response";
import { wallets } from "../db/schema";
import { eq } from "drizzle-orm"

dotenv.config()

const walletRouter = new Hono()

walletRouter.use("/*",
  jwt({
    secret: process.env.JWT_SECRET!,
  })
)

walletRouter.get("/wallet", async (c) => {
    const payload = c.get("jwtPayload");
    if (!payload) return c.json({ message: "Unauthorized" }, HttpStatusCode.Unauthorized);
    const userId = payload.id;
    try{
        const response = await db.select({balance: wallets.balance})
            .from(wallets)
            .where(eq(wallets.userId, userId))
            .then(res => res[0]);
        
        if (response){
            return c.json({ balance: response?.balance }, HttpStatusCode.Ok)
        }
        else return c.json({ message: "No wallet present for this user" }, HttpStatusCode.BadRequest)
    }
    catch(err){
        return c.json({
            message: "Error in finding the user's wallet balance",
            error: err
    }, HttpStatusCode.ServerError);
    }
})

walletRouter.post('/wallet', async (c) => {
    const payload = c.get("jwtPayload");
    if (!payload) return c.json({ message: "Unauthorized" }, HttpStatusCode.Unauthorized);
    const userId = payload.id;
    const body = await c.req.json();

    try{
        await db.insert(wallets)
        .values({userId, balance: body.balance });
        return c.json({ message: "User's Wallet created Successfully" }, HttpStatusCode.Ok)
    } catch(err){
        return c.json( {
            message: "Error in creating the wallet",
            error: err
        }, HttpStatusCode.Forbidden)
    }
})

walletRouter.put('/wallet/deposit', async (c) => {
    const payload = c.get("jwtPayload");
    if (!payload) return c.json({ message: "Unauthorized" }, HttpStatusCode.Unauthorized);
    const userId = payload.id;
    const { balance } = await c.req.json();

    if (!balance || Number(balance) <= 0) {
        return c.json(
        { message: "Invalid deposit amount" },
        HttpStatusCode.BadRequest
        );
    }

    try{
        await db.update(wallets)
        .set({ balance })
        .where(eq(wallets.userId, userId))
        
        return c.json({ message: "User's Wallet balanced increased" }, HttpStatusCode.Ok)
    } catch(err){
        return c.json( {
            message: "Error in increasing the wallet balance",
            error: err
        }, HttpStatusCode.Forbidden)
    }
})

export default walletRouter;