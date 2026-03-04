import { redisClient } from "../redis/client";
import type { Candle } from "../types/candleType";

const HISTORY_LIMIT = 100;

export async function getCurrentCandle(symbol: string): Promise<Candle | null> {
  const key = `candle:current:${symbol}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCurrentCandle(symbol: string, candle: Candle): Promise<void> {
  const key = `candle:current:${symbol}`;
  await redisClient.set(key, JSON.stringify(candle));
}

export async function getCandleHistory(symbol: string, limit: number = HISTORY_LIMIT): Promise<Candle[]> {
  const key = `candle:history:${symbol}`;
  const data = await redisClient.lrange(key, 0, limit - 1);
  return data.map(item => JSON.parse(item));
}

export async function addToHistory(symbol: string, candle: Candle): Promise<void> {
  const key = `candle:history:${symbol}`;
  await redisClient.lpush(key, JSON.stringify(candle));
  await redisClient.ltrim(key, 0, HISTORY_LIMIT - 1);
}

export async function getSymbolData(symbol: string) {
  const [current, history] = await Promise.all([
    getCurrentCandle(symbol),
    getCandleHistory(symbol)
  ]);
  return { current, history };
}