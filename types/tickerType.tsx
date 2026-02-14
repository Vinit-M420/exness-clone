export type Ticker = {
  price: number;
  timestamp: number;
  signal: "buy" | "sell" | "neutral";
  ask?: number,
  bid?: number
};