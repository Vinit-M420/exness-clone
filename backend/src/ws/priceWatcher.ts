import { openPosition } from "./openPosition";
import { closePosition } from "./closePosition";
import { redisClient } from "../redis/client";

export async function priceWatcher(symbol: string, currentPrice: number) {
  // console.log(`[PriceWatcher] ${symbol} @ ${currentPrice}`);

  // ===== TRIGGER ORDERS =====
  // BUY trigger: Execute when price drops to or below trigger price
  // Get all buy orders where triggerPrice >= currentPrice
  const buyOrders = await redisClient.zrangebyscore(
    `trigger:${symbol}:buy`,
    currentPrice,
    "+inf"
  );

  // SELL trigger: Execute when price rises to or above trigger price
  // Get all sell orders where triggerPrice <= currentPrice
  const sellOrders = await redisClient.zrangebyscore(
    `trigger:${symbol}:sell`,
    "-inf",
    currentPrice
  );

  // console.log(`[PriceWatcher] Found ${buyOrders.length} buy orders, ${sellOrders.length} sell orders`);

  // Execute triggered buy orders
  for (const orderId of buyOrders) {
    console.log(`[Trigger] Executing BUY order ${orderId} @ ${currentPrice}`);
    // Remove from Redis FIRST to prevent duplicate processing
    await redisClient.zrem(`trigger:${symbol}:buy`, orderId);
    // Then execute (even if this fails, order won't be retried)
    await openPosition(orderId, symbol, "buy", currentPrice);
  }

  // Execute triggered sell orders
  for (const orderId of sellOrders) {
    console.log(`[Trigger] Executing SELL order ${orderId} @ ${currentPrice}`);
    // Remove from Redis FIRST to prevent duplicate processing
    await redisClient.zrem(`trigger:${symbol}:sell`, orderId);
    // Then open position
    await openPosition(orderId, symbol, "sell", currentPrice);
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
  for (const orderId of buySLOrders) {
    const slPrice = await redisClient.zscore(`sl:${symbol}:buy`, orderId);
    if (slPrice && currentPrice <= slPrice) {
      console.log(`[SL] Closing BUY position ${orderId} - SL hit @ ${currentPrice} (SL: ${slPrice})`);
      await redisClient.zrem(`sl:${symbol}:buy`, orderId);
      await redisClient.zrem(`tp:${symbol}:buy`, orderId);
      await closePosition(orderId, symbol, currentPrice, "stop_loss");
    }
  }

  for (const orderId of buyTPOrders) {
    const tpPrice = await redisClient.zscore(`tp:${symbol}:buy`, orderId);
    if (tpPrice && currentPrice >= tpPrice) {
      console.log(`[TP] Closing BUY position ${orderId} - TP hit @ ${currentPrice} (TP: ${tpPrice})`);
      await redisClient.zrem(`sl:${symbol}:buy`, orderId);
      await redisClient.zrem(`tp:${symbol}:buy`, orderId);
      await closePosition(orderId, symbol, currentPrice, "take_profit");
    }
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
  for (const orderId of sellSLOrders) {
    const slPrice = await redisClient.zscore(`sl:${symbol}:sell`, orderId);
    if (slPrice && currentPrice >= slPrice) {
      console.log(`[SL] Closing SELL position ${orderId} - SL hit @ ${currentPrice} (SL: ${slPrice})`);
      await redisClient.zrem(`sl:${symbol}:sell`, orderId);
      await redisClient.zrem(`tp:${symbol}:sell`, orderId);
      await closePosition(orderId, symbol, currentPrice, "stop_loss");
    }
  }

  for (const orderId of sellTPOrders) {
    const tpPrice = await redisClient.zscore(`tp:${symbol}:sell`, orderId);
    if (tpPrice && currentPrice <= tpPrice) {
      console.log(`[TP] Closing SELL position ${orderId} - TP hit @ ${currentPrice} (TP: ${tpPrice})`);
      await redisClient.zrem(`sl:${symbol}:sell`, orderId);
      await redisClient.zrem(`tp:${symbol}:sell`, orderId);
      await closePosition(orderId, symbol, currentPrice, "take_profit");
    }
  }
}