import { connectFinnhub, subscribeSymbol } from "./finnhub";

const clients = new Set<Bun.ServerWebSocket>()

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
    open(ws) {
      console.log("Client connected");
      clients.add(ws);

      // TEMP: auto subscribe for testing
      subscribeSymbol("AAPL");
    },

    message(ws, message) {
      const parsed = JSON.parse(message.toString());

      if (parsed.type === "subscribe") {
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