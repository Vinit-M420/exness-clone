import { z } from "zod";
import { AllSymbols } from "../data/allsymbols";

export const SymbolEnum = z.enum(AllSymbols);
export type Symbol = z.infer<typeof SymbolEnum>;

export const MarketOrderRequestSchema = z.object({
    symbol: SymbolEnum,
    side: z.enum(["buy", "sell"]),
    lotSize: z.number().positive("Lot size must be greater than 0"),
    stopLoss: z.number().positive().optional(),
    takeProfit: z.number().positive().optional(),

})

export const LimitOrderRequestSchema =  MarketOrderRequestSchema.extend({
    triggerPrice: z.number().positive("Trigger price must be greater than 0"),
})