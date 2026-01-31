import { db } from "../db";
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { HttpStatusCode } from "../schemas/http_response";
import { wallet_transactions, wallets } from "../db/schema";
import { eq, desc } from "drizzle-orm"

const walletRouter = new Hono();

walletRouter.use("/*",
  jwt({
    secret: process.env.JWT_SECRET!,
    alg: "HS256",
  })
)

walletRouter.get("/get", async (c) => {
    const payload = c.get("jwtPayload");
    if (!payload) return c.json({ message: "Unauthorized" }, HttpStatusCode.Unauthorized);
    const userId = payload.id;
    try{
        const response = await db.select({balance: wallets.balance, currency: wallets.currency})
            .from(wallets)
            .where(eq(wallets.userId, userId))
            .then(res => res[0]);
        
        if (response) return c.json({ response }, HttpStatusCode.Ok)
        else return c.json({ message: "No wallet present for this user" }, HttpStatusCode.BadRequest)
    }
    catch(err){
        return c.json({
            message: "Error in finding the user's wallet balance",
            error: err
        }, HttpStatusCode.ServerError);
    }
})

walletRouter.get("/transactions", async (c) => {
    const payload = c.get("jwtPayload");
    if (!payload) return c.json({ message: "Unauthorized" }, HttpStatusCode.Unauthorized);
    const userId = payload.id;
    const wallet_id = await db.select({id: wallets.id})
        .from(wallets)
        .where(eq(wallets.userId, userId))
        .then(res => res[0]?.id);

    if (!wallet_id)
        return c.json({ message: "No wallet present for this user" }, HttpStatusCode.BadRequest);

    
    
    try{
        const response = await db.select({
            type: wallet_transactions.type, 
            amount: wallet_transactions.amount, 
            balanceBefore: wallet_transactions.balanceBefore, 
            balanceAfter: wallet_transactions.balanceAfter,
            referenceId : wallet_transactions.referenceId,
            createdAt : wallet_transactions.createdAt,
            })
        .from(wallet_transactions)
        .where(eq(wallet_transactions.walletId, wallet_id))
        .orderBy(desc(wallet_transactions.createdAt));

        if (response.length > 0) return c.json({ response }, HttpStatusCode.Ok)
        else return c.json({ message: "No wallet transactions present" }, HttpStatusCode.BadRequest)
    } catch(err){
        return c.json({
            message: "Error in fetching the wallet transactions",
            error: err
        }, HttpStatusCode.ServerError);
    
    }
});

walletRouter.post('/create', async (c) => {
    const payload = c.get("jwtPayload");
    if (!payload) return c.json({ message: "Unauthorized" }, HttpStatusCode.Unauthorized);
    const userId = payload.id;
    const body = await c.req.json();

    const result = await db.select().from(wallets).where(eq(wallets.userId, userId)).then(res => res[0]);
    if (result?.balance) return c.json({ message: "User's Wallet already exists" }, HttpStatusCode.BadRequest);  

    try{
        await db.insert(wallets)
        .values({ userId, balance: body.balance });
        return c.json({ message: "User's Wallet created Successfully" }, HttpStatusCode.Ok)
    } catch(err){
        return c.json( {
            message: "Error in creating the wallet",
            error: err
        }, HttpStatusCode.Forbidden)
    }
})

walletRouter.put('/deposit', async (c) => {
    const payload = c.get("jwtPayload");
    if (!payload) return c.json({ message: "Unauthorized" }, HttpStatusCode.Unauthorized);
    const userId = payload.id;

    const result = await db.select({ id: wallets.id, balance: wallets.balance })
                    .from(wallets)
                    .where(eq(wallets.userId, userId))
                    .then(res => res[0]);
  
    if (!result?.id) {
        return c.json({ message: "No wallet present for this user" }, HttpStatusCode.BadRequest);
    }

    const { balance } = await c.req.json();
    if (!balance || Number(balance) <= 0) {
        return c.json({ message: "Invalid deposit amount" }, HttpStatusCode.BadRequest);
    }


    try{
        await db.transaction(async (tx) => {
            await tx.insert(wallet_transactions)
            .values({ walletId: result.id, type: "deposit", 
            amount: balance, balanceBefore: result.balance, 
            balanceAfter: (Number(balance) + Number(result.balance)).toString() });
        
            await tx.update(wallets)
            .set({ balance: (Number(result.balance) + Number(balance)).toString() })
            .where(eq(wallets.userId, userId)); 
        })
        
        
        return c.json({ message: "User's Wallet balanced increased" }, HttpStatusCode.Ok)
    } catch(err){
        return c.json( {
            message: "Error in increasing the wallet balance",
            error: err
        }, HttpStatusCode.Forbidden)
    }
})

export default walletRouter;