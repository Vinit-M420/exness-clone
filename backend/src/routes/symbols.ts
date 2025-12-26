import { Hono } from "hono";
import { symbols } from "../data/symbols";

const symbolsRouter = new Hono();

symbolsRouter.get("/top", (c) => {
  return c.json(symbols);
});

// symbolsRouter.get("/subscribed", (c) => {
  
// });


export default symbolsRouter;
