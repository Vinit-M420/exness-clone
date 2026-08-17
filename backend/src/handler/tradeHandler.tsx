import { processTrade } from "../candles/candleEngine";
import type { CandleUpdate } from "../types/candleType";

interface FinnhubTrade {
  s: string;  // symbol
  p: number;  // price
  v: number;  // volume
  t: number;  // timestamp
}

export async function handleTrades(trades: FinnhubTrade[]): Promise<CandleUpdate[]> {
  if (!trades || trades.length === 0) return [];

  const updates: CandleUpdate[] = [];

  for (const trade of trades) {
    try {
      const result = await processTrade(trade.s, trade.p, trade.v, trade.t);
      if (result) {
        updates.push(result);
      }
    } catch (error) {
      // Don't let one bad trade abort the rest of the batch.
      console.error(`Error processing trade for ${trade.s}:`, error);
    }
  }

  return updates;
}