export type Ticker = {
  symbol: string
  price: number
  timestamp: number
  signal: "buy" | "sell" | "neutral"
  ask?: number
  bid?: number
};