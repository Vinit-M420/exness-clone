import { Hono } from "hono";
import dotenv from "dotenv";
import { eq } from "drizzle-orm"
import { users } from "../db/schema"
import { db } from "../db";
import { UserSigninSchema, UserSignupSchema } from "../schemas/user_schema";
import { HttpStatusCode } from "../schemas/response";
import { sign } from "hono/jwt";
dotenv.config()

const userRouter = new Hono()

userRouter.post("/auth/signup", async (c) =>{
    
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

userRouter.post("/auth/login", async (c) => {
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
        .select({ id: users.id, password })
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


userRouter.get("/user/me", async (c) =>{
    const { userId } = c.get("jwtPayload");

    try{
        const response = db.select({name: users.name, email: users.email, password: users.password })
        .from(users)
        .where(eq(users.id, userId))
        .then(res => res[0])

        return c.json({ response }, HttpStatusCode.Ok)
    } catch(err){
        return c.json({
            message: "Error in finding the user's detail",
            error: err
    }, HttpStatusCode.ServerError);
}
})

userRouter.put("/user/update", async (c) => {
    const { userId } = await c.get("jwtPayload");
    const body = await c.req.json();
    const { name, email, password } = body;

    const parsedBodyWithSuccess = UserSignupSchema.safeParse(body);

    if(!parsedBodyWithSuccess.success){
        return c.json({
            message: "Email or Password has incorrect format",
            errors: parsedBodyWithSuccess.error,
        }, HttpStatusCode.BadRequest);
    }

    try{
        const hashedPass = await Bun.password.hash(password, { algorithm: "bcrypt"});
        await db.update(users)
            .set({ name, email, password: hashedPass })
            .where(eq(users.id, userId))
        
        return c.json({  message: "Updated your user details" }, HttpStatusCode.Ok)
    }catch(err){
        return c.json({
            message: "Error in updating the user's detail",
            error: err
        }, HttpStatusCode.ServerError)
    }
});

export default userRouter