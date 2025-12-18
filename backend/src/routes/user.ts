import app from "../app";
import { eq } from "drizzle-orm"
import { users } from "../db/schema"
import { db } from "../db";
import { UserSigninSchema, UserSignupSchema } from "../schemas/user_schema";

app.post("/signup", async (c) =>{
    
    const body = await c.req.json();
    const { name, email, password } = body;

    const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))

    const existingUser = user[0]

    if (existingUser){
        c.status(403);
        return c.json({
            message: "You are already signed up"
        })
    }

    const parsedBodyWithSuccess = UserSignupSchema.safeParse(body);

    if(!parsedBodyWithSuccess.success){
        c.status(400);
        return c.json({
            message: "Email or Password has incorrect format",
            errors: parsedBodyWithSuccess.error,
        });
    }

    try{
        const hashedPass = await Bun.password.hash(password, { algorithm: "bcrypt"});
        await db.insert(users).values({name, email, password: hashedPass});
        c.status(200);
        c.json({  message:"User created Successfully" })
    } catch(err){
        c.status(403);
        c.json( {
            message: "Error in signing up the user",
            error: err
        })
    }

})
