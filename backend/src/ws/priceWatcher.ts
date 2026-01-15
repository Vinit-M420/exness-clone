import { OrderEngine } from "./orderEngine";
import { redisClient } from "../redis/client";


export async function priceWatcher(symbol: string, currentPrice: number){  
    const buyOrders = await redisClient.zrangebyscore(
        `trigger:${symbol}:BUY`,
        currentPrice, 
        "+inf"
    );

    const sellOrders = await redisClient.zrangebyscore(
        `trigger:${symbol}:SELL`,
        "-inf",
        currentPrice
    );
  
  for (const orderId of buyOrders){
    await OrderEngine(orderId, symbol, "BUY" , currentPrice);
    await redisClient.zrem(`trigger:${symbol}:BUY`, orderId);
  }

  for (const orderId of sellOrders){
    await OrderEngine(orderId, symbol, "SELL" , currentPrice);
    await redisClient.zrem(`trigger:${symbol}:SELL`, orderId);
  }

  const buySLOrders = await redisClient.zrangebyscore(
    `sl:${symbol}:BUY`, currentPrice, "+inf"  
  )

  const buyTPOrders = await redisClient.zrangebyscore(
    `tp:${symbol}:BUY`, "-inf" , currentPrice  
  )

  for (const orderId of [...buySLOrders, ...buyTPOrders]) {
    await OrderEngine(orderId, symbol, "BUY", currentPrice);
    await redisClient.zrem(`sl:${symbol}:BUY`, orderId);
    await redisClient.zrem(`tp:${symbol}:BUY`, orderId);
  }

  const sellSLOrders = await redisClient.zrangebyscore(
    `sl:${symbol}:SELL`, currentPrice, "+inf"  
  )

  const sellTPOrders = await redisClient.zrangebyscore(
    `tp:${symbol}:SELL`, "-inf" , currentPrice  
  )

  for (const orderId of [...sellSLOrders, ...sellTPOrders]) {
    await OrderEngine(orderId, symbol, "SELL", currentPrice);
    await redisClient.zrem(`sl:${symbol}:SELL`, orderId);
    await redisClient.zrem(`tp:${symbol}:SELL`, orderId);
  }

}