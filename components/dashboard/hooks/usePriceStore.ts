import { useEffect, useRef, useState, useCallback } from "react";
import { deriveSignal } from '../funcs/deriveSignal'
import { deriveAsk, deriveBid } from '../funcs/deriveAskBid';
import { Ticker } from "@/types/tickerType";
import { LatestSymbol } from "@/types/symbolType";

export function usePriceStore() {
  const wsRef = useRef<WebSocket | null>(null);

  const [tickers, setTickers] = useState<Record<string, Ticker>>({});

  useEffect(() => {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_API_BASE}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to backend WS");
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== "string") return;

      try {
        const tick = JSON.parse(event.data);
        // console.log("tick: ", tick)
        if (tick.type !== "trade" || !Array.isArray(tick.data)) return;

        const latestPerSymbol: Record<string, LatestSymbol> = {};

        for (const trade of tick.data) {
          latestPerSymbol[trade.s] = trade;
        }

        setTickers((prev) => {
          const updated = { ...prev };

          for (const symbol in latestPerSymbol) {
            const trade = latestPerSymbol[symbol];
            const previous = prev[symbol];

            updated[symbol] = {
              price: trade.p,
              timestamp: trade.t,
              signal: deriveSignal(previous?.price, trade.p),
              ask: deriveAsk(trade.p),
              bid: deriveBid(trade.p),
            };
          }

          return updated;
        });

      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from backend WS");
    };

    return () => {
      ws.close();
    };
  }, []);

  const subscribe = useCallback((symbol: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "subscribe",
        symbol,
      }));
    }
  }, []);

  const unsubscribe = useCallback((symbol: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "unsubscribe",
        symbol,
      }));
    }
  }, []);

  return { tickers, subscribe, unsubscribe };
}