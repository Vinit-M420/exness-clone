import dotenv from "dotenv";
import { set } from "./priceStore";
import { priceWatcher } from "./priceWatcher";
import { handleTrades } from "../handler/tradeHandler";
import { redisClient } from "../redis/client";
import type { CandleUpdate } from "../types/candleType";
dotenv.config();

const FINNHUB_WS_URL = "wss://ws.finnhub.io";
let finnhubSocket: WebSocket | null = null;
let candleCallback: ((updates: CandleUpdate[]) => void) | null = null;

export async function connectFinnhub(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMessage: (payload: any) => void,
  onCandleUpdate?: (updates: CandleUpdate[]) => void
) {
  if (finnhubSocket) return;

  if (onCandleUpdate) candleCallback = onCandleUpdate;
  
  finnhubSocket = new WebSocket(`${FINNHUB_WS_URL}?token=${process.env.FINNHUB_API_KEY}`);

  finnhubSocket.onopen = async () => {
    console.log("Connected to Finnhub WS");

    // Re-subscribe to whatever symbols were active before this connection
    // opened (initial boot, or after a dropped/reconnected upstream socket) -
    // otherwise price/candle flow silently stops after a reconnect until a
    // new frontend client happens to connect and re-triggers a subscribe.
    try {
      const symbols = await redisClient.smembers("active:symbols");
      for (const symbol of symbols) {
        subscribeSymbol(symbol);
      }
    } catch (error) {
      console.error("Failed to resubscribe active symbols on Finnhub connect:", error);
    }
  };

  finnhubSocket.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    // console.log("📥 Received from Finnhub:", msg.type, msg); 

    if (msg.type !== "trade" || !Array.isArray(msg.data) || msg.data.length === 0){
      // console.log("⏭️ Skipping non-trade message"); 
      return;
    } 
    onMessage(msg);

    const candleUpdates = await handleTrades(msg.data);
    if (candleUpdates.length > 0 && candleCallback) {
      candleCallback(candleUpdates);
    }

    const latestTrade = msg.data[msg.data.length - 1];
    set(latestTrade.s, latestTrade.p);
    // console.log("latestTrade:", latestTrade)
    await priceWatcher(latestTrade.s, latestTrade.p);
  };

  finnhubSocket.onclose = () => {
    console.log("Finnhub WS closed, reconnecting...");
    finnhubSocket = null;
    setTimeout(() => connectFinnhub(onMessage, candleCallback || undefined), 2000);  
  };

  finnhubSocket.onerror = (err) => console.error("Finnhub WS error", err);
}


export function subscribeSymbol(symbol: string) {
  finnhubSocket?.send(
    JSON.stringify({ type: "subscribe", symbol })
  );
}

export function unsubscribeSymbol(symbol: string) {
  finnhubSocket?.send(
    JSON.stringify({ type: "unsubscribe", symbol })
  );
}