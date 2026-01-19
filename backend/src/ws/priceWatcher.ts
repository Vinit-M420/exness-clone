import { OrderEngine } from "./orderEngine";
import { redisClient } from "../redis/client";

export async function priceWatcher(symbol: string, currentPrice: number) {
  console.log(`[PriceWatcher] ${symbol} @ ${currentPrice}`);

  // ===== TRIGGER ORDERS =====
  const buyOrders = await redisClient.zrangebyscore(
    `trigger:${symbol}:buy`,
    currentPrice,
    "+inf"
  );

  const sellOrders = await redisClient.zrangebyscore(
    `trigger:${symbol}:sell`,
    "-inf",
    currentPrice
  );

  console.log(`[PriceWatcher] Found ${buyOrders.length} buy orders, ${sellOrders.length} sell orders`);

  // Execute triggered buy orders
  for (const orderId of buyOrders) {
    console.log(`[Trigger] Executing BUY order ${orderId} @ ${currentPrice}`);
    await redisClient.zrem(`trigger:${symbol}:buy`, orderId);    
    await OrderEngine(orderId, symbol, "buy", currentPrice);
  }

  // Execute triggered sell orders
  for (const orderId of sellOrders) {
    console.log(`[Trigger] Executing SELL order ${orderId} @ ${currentPrice}`);
    await redisClient.zrem(`trigger:${symbol}:sell`, orderId);
    await OrderEngine(orderId, symbol, "sell", currentPrice);
  }

  // ===== STOP LOSS & TAKE PROFIT FOR BUY POSITIONS =====
  // BUY Stop Loss: Triggers when price drops to or below SL
  const buySLOrders = await redisClient.zrangebyscore(
    `sl:${symbol}:buy`,
    "-inf",
    currentPrice
  );

  // BUY Take Profit: Triggers when price rises to or above TP
  const buyTPOrders = await redisClient.zrangebyscore(
    `tp:${symbol}:buy`,
    currentPrice,
    "+inf"
  );

  // Close buy positions that hit SL or TP
  for (const orderId of [...buySLOrders, ...buyTPOrders]) {
    console.log(`[SL/TP] Closing BUY position ${orderId} @ ${currentPrice}`);
    await OrderEngine(orderId, symbol, "sell", currentPrice); // Close by selling
    await redisClient.zrem(`sl:${symbol}:buy`, orderId);
    await redisClient.zrem(`tp:${symbol}:buy`, orderId);
  }

  // ===== STOP LOSS & TAKE PROFIT FOR SELL POSITIONS =====
  // SELL Stop Loss: Triggers when price rises to or above SL
  const sellSLOrders = await redisClient.zrangebyscore(
    `sl:${symbol}:sell`,
    currentPrice,
    "+inf"
  );

  // SELL Take Profit: Triggers when price drops to or below TP
  const sellTPOrders = await redisClient.zrangebyscore(
    `tp:${symbol}:sell`,
    "-inf",
    currentPrice
  );

  // Close sell positions that hit SL or TP
  for (const orderId of [...sellSLOrders, ...sellTPOrders]) {
    console.log(`[SL/TP] Closing SELL position ${orderId} @ ${currentPrice}`);
    await OrderEngine(orderId, symbol, "buy", currentPrice); // Close by buying
    await redisClient.zrem(`sl:${symbol}:sell`, orderId);
    await redisClient.zrem(`tp:${symbol}:sell`, orderId);
  }
}