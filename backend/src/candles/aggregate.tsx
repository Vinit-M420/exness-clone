import type { Candle } from "../types/candleType";

export const ALLOWED_INTERVALS_MINUTES = [1, 5, 15, 30, 60, 240, 1440] as const;
export type IntervalMinutes = (typeof ALLOWED_INTERVALS_MINUTES)[number];

// Rolls up 1-minute candles (must be ascending by time) into `intervalMinutes`
// buckets. Storage stays 1-minute-only (see candleStore.tsx) - higher
// timeframes are derived on read instead of maintained as separate live
// aggregates, so this is only as accurate as the underlying 1-minute history
// retention allows.
export function aggregateCandles(candles: Candle[], intervalMinutes: number): Candle[] {
  if (intervalMinutes <= 1 || candles.length === 0) return candles;

  const bucketMs = intervalMinutes * 60000;
  const result: Candle[] = [];

  for (const candle of candles) {
    const bucketTime = Math.floor(candle.time / bucketMs) * bucketMs;
    const last = result[result.length - 1];

    if (last && last.time === bucketTime) {
      last.high = Math.max(last.high, candle.high);
      last.low = Math.min(last.low, candle.low);
      last.close = candle.close;
      last.volume += candle.volume;
    } else {
      result.push({
        time: bucketTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      });
    }
  }

  return result;
}
