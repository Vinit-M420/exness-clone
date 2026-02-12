import { Hono } from 'hono';
import userRouter from "./routes/user"
import walletRouter from './routes/wallets';
import symbolsRouter from './routes/symbols';
import authRouter from './routes/auth';
import orderRouter from './routes/orders';
import { cors } from "hono/cors";

const app = new Hono()

app.get('/', (c) => c.text('Exness Clone'));
app.route("/api/v1/auth", authRouter);
app.route("/api/v1/user", userRouter);
app.route("/api/v1/wallet", walletRouter);
app.route("/api/v1/symbols", symbolsRouter);
app.route("/api/v1/order", orderRouter)

app.use("*", cors({
  origin: "http://localhost:3000",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

export default app;