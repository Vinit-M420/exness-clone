import { redisClient } from "../redis/client";
import type { subscription } from "../types/subscription";
import { connectFinnhub, subscribeSymbol } from "./finnhub";
import type { CandleUpdate } from "../types/candleType";


const clients = new Set<Bun.ServerWebSocket>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSubscription(obj: any): obj is subscription {
  return obj && obj.type === "subscribe" && typeof obj.symbol === "string";
}

connectFinnhub(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data: any) => {
    // console.log("📊 Broadcasting trade data to", clients.size, "clients:", data); 
    for (const client of clients) {
      client.send(JSON.stringify(data));
    }
  },

  (updates: CandleUpdate[]) => {
    // console.log("🕯️ Broadcasting candle updates:", updates); 
    for (const update of updates) {
      for (const client of clients) {
        client.send(JSON.stringify(update));
      }
    }
  }
);

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


      const symbols = await redisClient.smembers("active:symbols");
      for (const symbol of symbols) {
        subscribeSymbol(symbol);
      }
    },

    message(ws, message) {
      const parsed = JSON.parse(message.toString());

      if (isSubscription(parsed)) {
        subscribeSymbol(parsed.symbol);
      }
    },

    close(ws) {
      clients.delete(ws);
      console.log("Client disconnected");
    },
  },
});

console.log("🚀 WS server running on ws://localhost:3001");