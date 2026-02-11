import { z } from "zod";
import { AllSymbols } from "../../../data/allsymbols";

const SymbolEnum = z.enum(AllSymbols);

export const Watchlist_Schema = z.array(
  z.object({
    symbol: SymbolEnum,
    orderIndex: z.number().int().positive(),
  })
);
