import { z } from "zod";
import { AllSymbols } from "../data/allsymbols";

export const SymbolEnum = z.enum(AllSymbols);
export type Symbol = z.infer<typeof SymbolEnum>;

export const MarketOrderRequestSchema = z.object({
    symbol: SymbolEnum,
    side: z.enum(["buy", "sell"]),
    orderType: z.literal("market"),
    lotSize: z.number().positive("Lot size must be greater than 0"),

})