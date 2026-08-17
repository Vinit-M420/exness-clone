import { redisClient } from "../redis/client";
import type { Candle } from "../types/candleType";

const HISTORY_LIMIT = 100;

// How long an idle symbol's candle data lingers in Redis before expiring.
// Refreshed on every write, so actively-traded symbols never expire.
const CURRENT_CANDLE_TTL_SECONDS = 60 * 60 * 24; // 24h
const HISTORY_TTL_SECONDS = 60 * 60 *24 * 7; // 7 days

export async function getCurrentCandle(symbol: string): Promise<Candle | null> {
  const key = `candle:current:${symbol}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

export async function getCandleHistory(symbol: string, limit: number = HISTORY_LIMIT): Promise<Candle[]> {
  const key = `candle:history:${symbol}`;
  const data = await redisClient.lrange(key, 0, limit - 1);
  return data.map(item => JSON.parse(item));
}

export async function getSymbolData(symbol: string) {
  const [current, history] = await Promise.all([
    getCurrentCandle(symbol),
    getCandleHistory(symbol)
  ]);
  return { current, history };
}

export type ApplyTradeResult =
  | { event: "new" | "update"; candle: Candle }
  | { event: "ignored" };

// Atomically read-modify-write the current candle in a single Redis EVAL so
// concurrent trade batches for the same symbol can't race on a plain
// GET-then-SET, and so a late/out-of-order trade (minute < current candle's
// minute) is dropped instead of corrupting or reopening a closed candle.
const APPLY_TRADE_SCRIPT = `
local currentKey = KEYS[1]
local historyKey = KEYS[2]
local minute = tonumber(ARGV[1])
local price = tonumber(ARGV[2])
local volume = tonumber(ARGV[3])
local historyLimit = tonumber(ARGV[4])
local currentTTL = tonumber(ARGV[5])
local historyTTL = tonumber(ARGV[6])

local currentRaw = redis.call('GET', currentKey)
local current = nil
if currentRaw then
  current = cjson.decode(currentRaw)
end

if current == nil or minute > current.time then
  if current ~= nil then
    redis.call('LPUSH', historyKey, cjson.encode(current))
    redis.call('LTRIM', historyKey, 0, historyLimit - 1)
    redis.call('EXPIRE', historyKey, historyTTL)
  end

  local newCandle = {
    time = minute,
    open = price,
    high = price,
    low = price,
    close = price,
    volume = volume
  }
  redis.call('SET', currentKey, cjson.encode(newCandle))
  redis.call('EXPIRE', currentKey, currentTTL)
  return cjson.encode({ event = "new", candle = newCandle })

elseif minute < current.time then
  -- Late/out-of-order trade for an already-closed minute; ignore it rather
  -- than corrupting the in-progress candle or reopening a stale one.
  return cjson.encode({ event = "ignored" })

else
  current.high = math.max(current.high, price)
  current.low = math.min(current.low, price)
  current.close = price
  current.volume = current.volume + volume
  redis.call('SET', currentKey, cjson.encode(current))
  redis.call('EXPIRE', currentKey, currentTTL)
  return cjson.encode({ event = "update", candle = current })
end
`;

export async function applyTrade(
  symbol: string,
  minute: number,
  price: number,
  volume: number
): Promise<ApplyTradeResult> {
  const currentKey = `candle:current:${symbol}`;
  const historyKey = `candle:history:${symbol}`;

  const raw = await redisClient.send("EVAL", [
    APPLY_TRADE_SCRIPT,
    "2",
    currentKey,
    historyKey,
    String(minute),
    String(price),
    String(volume),
    String(HISTORY_LIMIT),
    String(CURRENT_CANDLE_TTL_SECONDS),
    String(HISTORY_TTL_SECONDS),
  ]);

  return JSON.parse(raw as string);
}
