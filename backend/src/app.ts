import { Hono } from 'hono'
import userRouter from "./routes/user"
import walletRouter from './routes/wallets';

const app = new Hono()

app.get('/', (c) => c.text('Hono!'));
app.route("/", userRouter);
app.route("/", walletRouter);

export default app;