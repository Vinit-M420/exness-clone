import { db } from "../db";
import { Hono } from "hono";
import { eq } from "drizzle-orm"
import { users, users_watchlist } from "../db/schema"
import { UpdateEmailSchema, UpdatePwdSchema } from "../schemas/user_schema";
import { HttpStatusCode } from "../schemas/http_response";
import { jwt } from "hono/jwt";
import { Watchlist_Schema } from "../schemas/watchlist_schema";

const userRouter = new Hono()

userRouter.use("/*",
  jwt({
    secret: process.env.JWT_SECRET!,
    alg: "HS256",
  })
)

userRouter.get("/me", async (c) =>{
    const payload = c.get("jwtPayload");
    
    if (!payload) return c.json({ message: "Unauthorized" }, HttpStatusCode.Unauthorized);
    
    const userId = payload.id;

    try{
        const response = await db.select({name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .then(res => res[0]);
        // console.log(response);
        return c.json({ response }, HttpStatusCode.Ok)

    } catch(err){
        return c.json({
            message: "Error in finding the user's detail",
            error: err
    }, HttpStatusCode.ServerError);
}
})

userRouter.put("/password", async (c) => {
    const { id } = await c.get("jwtPayload");
    const body = await c.req.json();

    const parsedBodyWithSuccess = UpdatePwdSchema.safeParse(body);

    if(!parsedBodyWithSuccess.success){
        return c.json({
            message: "Password has incorrect format",
            errors: parsedBodyWithSuccess.error.flatten(),
        }, HttpStatusCode.BadRequest);
    }

    try{
        const [user] = await db
        .select({ password: users.password })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

        if (!user) return c.json({ message: "User not found" }, HttpStatusCode.NotFound);

        const isSame = await Bun.password.verify(body.password, user.password);
        if (isSame) return c.json({ message: "New password must be different" }, HttpStatusCode.BadRequest);

        const newHash = await Bun.password.hash(body.password);
        await db.update(users).set({ password: newHash }).where(eq(users.id, id));
        
        return c.json({  message: "Updated your user's password" }, HttpStatusCode.Ok)
    }
    catch(err){
        return c.json({
            message: "Error in updating the user's password",
            error: err
        }, HttpStatusCode.ServerError)
    }
});


userRouter.put("/email", async (c) => {
    const { id } = await c.get("jwtPayload");
    const body = await c.req.json();

    const parsedBodyWithSuccess = UpdateEmailSchema.safeParse(body);

    if(!parsedBodyWithSuccess.success){
        return c.json({
            message: "Email has incorrect format",
            errors: parsedBodyWithSuccess.error.flatten(),
        }, HttpStatusCode.BadRequest);
    }

    try{
        await db.update(users)
            .set({ email: body.email })
            .where(eq(users.id, id))
        
        return c.json({  message: "Updated your user's email" }, HttpStatusCode.Ok)
    }catch(err){
        return c.json({
            message: "Error in updating the user's email",
            error: err
        }, HttpStatusCode.ServerError)
    }
});

userRouter.get("/watchlist", async (c) => {
    const payload = c.get("jwtPayload");
    if (!payload) return c.json({ message: "Unauthorized" }, HttpStatusCode.Unauthorized);
    const userId = payload.id;


    const symbolList = await db.select({symbol: users_watchlist.symbol, orderIndex: users_watchlist.orderIndex})
                    .from(users_watchlist)
                    .where(eq(users_watchlist.userId, userId))
                    .orderBy(users_watchlist.orderIndex);

    if (symbolList.length === 0 || !symbolList){ 
        return c.json({ "message": "No watchlist symbols found" }, HttpStatusCode.NotFound);               
    }

    return c.json({ message: "Watchlist returned", symbolList }, HttpStatusCode.Ok); 
});

userRouter.put("/watchlist", async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload) {
    return c.json({ message: "Unauthorized" }, HttpStatusCode.Unauthorized);
  }

  const body = await c.req.json();
  const parsed = Watchlist_Schema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        message: "Watchlist has incorrect format",
        errors: parsed.error
      },
      HttpStatusCode.BadRequest
    );
  }

  const userId = payload.id;
  const symbols = parsed.data; 

  await db.transaction(async (tx) => {
    await tx
      .delete(users_watchlist)
      .where(eq(users_watchlist.userId, userId));

    await tx.insert(users_watchlist).values(
      symbols.map((item: { symbol: string; orderIndex: number; }) => ({
        userId,
        symbol: item.symbol,
        orderIndex: item.orderIndex,
        updatedAt: new Date(), 
      }))
    );
  });

  return c.json({ message: "Watchlist updated" });
});


export default userRouter;