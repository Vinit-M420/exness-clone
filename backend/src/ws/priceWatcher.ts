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
}