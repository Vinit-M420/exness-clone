import { applyTrade } from "./candleStore";
import type { CandleUpdate } from "../types/candleType";

export async function processTrade(
  symbol: string,
  price: number,
  volume: number,
  timestamp: number
): Promise<CandleUpdate | null> {

  const minute = Math.floor(timestamp / 60000) * 60000;
  const result = await applyTrade(symbol, minute, price, volume);

  if (result.event === "ignored") {
    return null;
  }

  return {
    type: "candle",
    symbol,
    event: result.event,
    candle: result.candle,
  };
}
