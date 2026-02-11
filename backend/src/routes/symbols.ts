import { Hono } from "hono";
import { topsymbols } from "../../../data/topsymbols";

const symbolsRouter = new Hono();

symbolsRouter.get("/top", (c) => {
  return c.json(topsymbols);
});


export default symbolsRouter;