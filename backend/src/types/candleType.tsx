
export interface Candle {
  time: number;      // Unix timestamp (minute precision)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleUpdate {
  type: "candle";
  symbol: string;
  event: "new" | "update";
  candle: Candle;
}