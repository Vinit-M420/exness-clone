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

export const LimitOrderRequestSchema = MarketOrderRequestSchema.extend({
  triggerPrice: z.number().positive("Trigger price must be greater than 0"),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
})
.superRefine((data, ctx) => {
  if (data.side === 'buy') { // long
    if (data.stopLoss && data.stopLoss >= data.triggerPrice) {
      ctx.addIssue({
        code: "custom",
        message: "Stop loss cannot be greater than trigger price",
        path: ["stopLoss"],
      });
    }
    if (data.takeProfit && data.takeProfit <= data.triggerPrice) {
      ctx.addIssue({
        code: "custom",
        message: "Take profit cannot be less than trigger price",
        path: ["takeProfit"],
      });
    }
  }
  
  if (data.side === 'sell') { // short
    if (data.stopLoss && data.stopLoss <= data.triggerPrice) {
      ctx.addIssue({
        code: "custom",
        message: "Stop loss cannot be less than trigger price",
        path: ["stopLoss"],
      });
    }
    if (data.takeProfit && data.takeProfit >= data.triggerPrice) {
      ctx.addIssue({
        code: "custom",
        message: "Take profit cannot be greater than trigger price",
        path: ["takeProfit"],
      });
    }
  }
});

export const AddLimitsSchema = z.object({
    // triggerPrice: z.number().positive("Trigger price must be greater than 0"),
    stopLoss: z.number().positive().nullable(),
    takeProfit: z.number().positive().nullable(),
}).superRefine((data, ctx) => {
    if (data.stopLoss === undefined && data.takeProfit === undefined) {
        ctx.addIssue({
            code: "custom",
            message: "At least one of stopLoss or takeProfit must be provided",
        });
    }
});