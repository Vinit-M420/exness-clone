import { redisClient } from "../redis/client";
import type { subscription } from "../types/subscription";
import { connectFinnhub, subscribeSymbol } from "./finnhub";

const clients = new Set<Bun.ServerWebSocket>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSubscription(obj: any): obj is subscription {
  return (
    obj &&
    obj.type === "subscribe" &&
    typeof obj.symbol === "string"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
connectFinnhub((data: any) => {

  // Broadcast Finnhub data to all connected clients
  for (const client of clients) {
    client.send(JSON.stringify(data));
  }
});

Bun.serve({
  port: 3001,

  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response("WS server running");
  },

  websocket: {
    async open(ws) {
      console.log("Client connected");
      clients.add(ws);

      // subscribeSymbol("AAPL"); // for testing, comment it out later
      
      const symbols = await redisClient.smembers("active:symbols");

      for (const symbol of symbols) {
        subscribeSymbol(symbol);
      };
    },

    message(ws, message) {
      const raw = message.toString();
      const parsed = JSON.parse(raw);
      // console.log("Parsed Message:" , parsed);

      if (isSubscription(parsed)){
        subscribeSymbol(parsed.symbol);
        ws.send("Subscribed to " + parsed.symbol)
      }
    },

    close(ws) {
      clients.delete(ws);
      console.log("Client disconnected");
    },
  },
});

console.log("🚀 WS server running on ws://localhost:3001");