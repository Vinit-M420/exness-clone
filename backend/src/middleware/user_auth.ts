import { jwt } from 'hono/jwt'
import app from "../app";
import dotenv from "dotenv";
dotenv.config()

app.use("/user/*", jwt({
    secret: process.env.JWT_SECRET!,
  })
)
