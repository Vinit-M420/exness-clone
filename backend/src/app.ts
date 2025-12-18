import { Hono } from 'hono'
import userRouter from "./routes/user"

const app = new Hono()

app.get('/', (c) => c.text('Hono!'));
app.route("/", userRouter);

export default app