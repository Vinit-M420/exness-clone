import { getCurrentCandle, setCurrentCandle, addToHistory } from "./candleStore";
import type { Candle, CandleUpdate } from "../types/candleType";

export async function processTrade(
  symbol: string,
  price: number,
  volume: number,
  timestamp: number
): Promise<CandleUpdate | null> {
  const minute = Math.floor(timestamp / 60000) * 60000;
  const current = await getCurrentCandle(symbol);

  // New minute - create new candle
  if (!current || current.time !== minute) {
    if (current) {
      await addToHistory(symbol, current);
    }

    const newCandle: Candle = {
      time: minute,
      open: price,
      high: price,
      low: price,
      close: price,
      volume,
    };

    await setCurrentCandle(symbol, newCandle);

    return {
      type: "candle",
      symbol,
      event: "new",
      candle: newCandle,
    };
  }

  // Update existing candle
  current.high = Math.max(current.high, price);
  current.low = Math.min(current.low, price);
  current.close = price;
  current.volume += volume;

  await setCurrentCandle(symbol, current);

  return {
    type: "candle",
    symbol,
    event: "update",
    candle: current,
  };
}