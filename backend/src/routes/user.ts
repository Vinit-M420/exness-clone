import dotenv from "dotenv";
import { db } from "../db";
import { Hono } from "hono";
import { eq } from "drizzle-orm"
import { users } from "../db/schema"
import { UpdateEmailSchema, UpdatePwdSchema } from "../schemas/user_schema";
import { HttpStatusCode } from "../schemas/http_response";
import { jwt } from "hono/jwt";
dotenv.config()

const userRouter = new Hono()


userRouter.use("/*",
  jwt({
    secret: process.env.JWT_SECRET!,
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
        const hashedPass = await Bun.password.hash(body.password, { algorithm: "bcrypt"});
        // console.log(body.password, hashedPass);

        await db.update(users)
            .set({ password: hashedPass })
            .where(eq(users.id, id))
        
        return c.json({  message: "Updated your user's password" }, HttpStatusCode.Ok)
    }catch(err){
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

export default userRouter;