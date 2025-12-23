import { Hono } from 'hono'
import userRouter from "./routes/user"
import walletRouter from './routes/wallets';
import symbolsRouter from './routes/symbols';
import authRouter from './routes/auth';

const app = new Hono()

app.get('/', (c) => c.text('Hono!'));
app.route("/api/v1/auth", authRouter);
app.route("/api/v1/user", userRouter);
app.route("/api/v1/wallet", walletRouter);
app.route("/api/v1/symbols", symbolsRouter);

export default app;