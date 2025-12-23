import { Hono } from "hono";
import { symbols } from "../data/symbols";
import { jwt } from "hono/jwt";

const symbolsRouter = new Hono();

symbolsRouter.use("/*",
  jwt({
    secret: process.env.JWT_SECRET!,
  })
)

symbolsRouter.get("/top", (c) => {
  return c.json(symbols);
});

export default symbolsRouter;
