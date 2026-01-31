import { db } from "../db";
import { Hono } from "hono";
import { eq } from "drizzle-orm"
import { users } from "../db/schema"
import { UserSigninSchema, UserSignupSchema } from "../schemas/user_schema";
import { HttpStatusCode } from "../schemas/http_response";
import { sign } from "hono/jwt";

const authRouter = new Hono();

authRouter.post("/signup", async (c) =>{
    
    const body = await c.req.json();
    const { name, email, password } = body;

    const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))

    const existingUser = user[0]

    if (existingUser){
        return c.json({
            message: "You are already signed up"
        }, HttpStatusCode.Forbidden)
    }

    const parsedBodyWithSuccess = UserSignupSchema.safeParse(body);

    if(!parsedBodyWithSuccess.success){
        const formatted = parsedBodyWithSuccess.error.flatten();        
        return c.json({
            message: "Email or Password has incorrect format",
            errors: formatted.fieldErrors,
        }, HttpStatusCode.BadRequest);
    }

    try{
        const hashedPass = await Bun.password.hash(password, { algorithm: "bcrypt"});
        await db.insert(users).values({name, email, password: hashedPass});
        return c.json({ message: "User created Successfully" }, HttpStatusCode.Ok)
    } catch(err){
        return c.json( {
            message: "Error in signing up the user",
            error: err
        }, HttpStatusCode.Forbidden)
    }

})

authRouter.post("/login", async (c) => {
    const body = await c.req.json();
    const { email, password } = body;

    const parsed = UserSigninSchema.safeParse(body);

    if(!parsed.success){
        return c.json({
            message: "Email or Password has incorrect format",
            errors: parsed.error,
        }, HttpStatusCode.BadRequest);
    }

    const user = await db
        .select({ id: users.id, password: users.password, })
        .from(users)
        .where(eq(users.email, email))

    const existingUser = user[0]

    if (!existingUser){
        return c.json({
            message: "You are not signed up. Please sign up!"
        }, HttpStatusCode.Forbidden)
    }

    try{
        const isMatch = await Bun.password.verify(password, existingUser.password);
        if(!isMatch){
            return c.json({ message: "Invalid password" }, HttpStatusCode.BadRequest)
        }else{
            const payload = {
                id: existingUser.id,
                exp: Math.floor(Date.now() / 1000) + 60 * 50 * 2, // 2 hours
            }
            const token = await sign(payload, process.env.JWT_SECRET!)
            return c.json({token: token, message: "Login Successful"}, HttpStatusCode.Ok);
        }
    }
    catch(err){
        return c.json({ message: "Server error while signing in", error: err }, HttpStatusCode.ServerError)}
    }
)

export default authRouter;