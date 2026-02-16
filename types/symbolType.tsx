export type SymbolType  = {
  symbol: string
  name: string
  type: string
  signal?:  "buy" | "sell" | "neutral"
  bid?: number
  ask?: number
}


export type LatestSymbol = {
  s: string;   // symbol
  p: number;   // price
  t: number;   // timestamp 
  v: number;   // volume
}