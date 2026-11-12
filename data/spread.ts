import { AllSymbols } from "./allsymbols";

/// Bid/ask spread per symbol, as a fraction of the mid price (0.0003 = 0.03%).
/// A percentage scales with the instrument, so the same setting works for BTC
/// (~$72k) and XRP (~$2). Display-only for now - the backend fills at mid price.

export const DEFAULT_SPREAD_PCT = 0.0003; // stocks/ETFs and anything not listed

export const SPREAD_PCT: Partial<Record<(typeof AllSymbols)[number], number>> = {
  "BINANCE:BTCUSDT": 0.0002,
  "BINANCE:ETHUSDT": 0.0003,
  "BINANCE:BNBUSDT": 0.0005,
  "BINANCE:SOLUSDT": 0.0005,
  "BINANCE:XRPUSDT": 0.001,
  "BINANCE:ADAUSDT": 0.001,
  "BINANCE:DOGEUSDT": 0.001,
  "BINANCE:AVAXUSDT": 0.001,
  "BINANCE:DOTUSDT": 0.001,
  "BINANCE:MATICUSDT": 0.001,
};

export function spreadFor(symbol: string, price: number) {
  const pct = SPREAD_PCT[symbol as (typeof AllSymbols)[number]] ?? DEFAULT_SPREAD_PCT;
  return price * pct;
}
