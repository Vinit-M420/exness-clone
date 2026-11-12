import { useEffect, useRef, useState, useCallback } from "react";
import { deriveSignal } from '../funcs/deriveSignal'
import { deriveAsk, deriveBid } from '../funcs/deriveAskBid';
import { Ticker } from "@/types/tickerType";
import { LatestSymbol } from "@/types/symbolType";

export function usePriceStore() {
  const wsRef = useRef<WebSocket | null>(null);
  // Symbols subscribed via subscribe(), re-sent on every (re)connect
  const subscribedRef = useRef<Set<string>>(new Set());

  const [tickers, setTickers] = useState<Record<string, Ticker>>({});

  useEffect(() => {
    let cancelled = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 1000; // exponential backoff: 1s -> 30s cap

    const connect = () => {
      if (cancelled) return;

      const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_API_BASE}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Connected to backend WS");
        reconnectDelay = 1000;

        for (const symbol of subscribedRef.current) {
          ws.send(JSON.stringify({ type: "subscribe", symbol }));
        }
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
              const signal = deriveSignal(previous?.price, trade.p);

              // EMA of recent tick direction (buy=1, sell=0) as a lightweight
              // stand-in for real order-book depth, which isn't available
              // from a trade-tick feed. Neutral ticks leave it unchanged.
              const prevRatio = previous?.buyRatio ?? 0.5;
              const alpha = 0.1;
              const buyRatio =
                signal === "buy" ? prevRatio * (1 - alpha) + alpha
                : signal === "sell" ? prevRatio * (1 - alpha)
                : prevRatio;

              updated[symbol] = {
                symbol: symbol,
                price: trade.p,
                timestamp: trade.t,
                signal,
                ask: deriveAsk(trade.p),
                bid: deriveBid(trade.p),
                buyRatio,
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
        if (!cancelled) {
          reconnectTimeout = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, []);

  const subscribe = useCallback((symbol: string) => {
    subscribedRef.current.add(symbol);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "subscribe",
        symbol,
      }));
    }
  }, []);

  const unsubscribe = useCallback((symbol: string) => {
    subscribedRef.current.delete(symbol);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "unsubscribe",
        symbol,
      }));
    }
  }, []);

  return { tickers, subscribe, unsubscribe };
}