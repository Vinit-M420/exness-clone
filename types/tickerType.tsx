export type Ticker = {
  symbol: string
  price: number
  timestamp: number
  signal: "buy" | "sell" | "neutral"
  ask?: number
  bid?: number
  // Exponential moving average of recent buy-vs-sell tick direction (0-1).
  // Used as a lightweight, non-random stand-in for real order-book depth,
  // which this app doesn't have access to.
  buyRatio: number
};