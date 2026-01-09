import { db } from "../db";
import { get } from "../ws/priceStore";
import { eq, and } from "drizzle-orm"
import { orders } from "../db/schema";
import { subscribeSymbol } from "../ws/finnhub";
import { addSymbols } from "../ws/activeSymbols";
import { OrderEngine } from "./orderEngine";
// import { redisClient } from "../redis/client";

export async function priceWatcher(){   
    const openOrders = await db
        .select({ id: orders.id, side: orders.side, 
            symbol: orders.symbol, triggerPrice: orders.triggerPrice })
        .from(orders)
        .where(and(
                eq(orders.status, "pending"), 
                eq( orders.orderType, "limit")));

    for (const openOrder of openOrders){
        const isFirst = addSymbols(openOrder.symbol);
        if (isFirst) subscribeSymbol(openOrder.symbol);
        
        // await redisClient.zadd(`trigger:${openOrder.symbol}`, 
        //     Number(openOrder.triggerPrice), openOrder.id);

        const currentPrice = get(openOrder.symbol);
        if (!currentPrice) continue;

        if (openOrder.side === "buy" && currentPrice <= Number(openOrder.triggerPrice)){
            await OrderEngine(openOrder.id, currentPrice);
        }

        if (openOrder.side === "sell" && currentPrice >= Number(openOrder.triggerPrice)){
            await OrderEngine(openOrder.id, currentPrice);
        }
    }  
}