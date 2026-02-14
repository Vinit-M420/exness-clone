export type SymbolType  = {
  symbol: string
  name: string
  type: string
  signal?:  "buy" | "sell" | "neutral"
  bid?: number
  ask?: number
}


export type SymbolTableType = {
  symbol: string
  name: string
  type: string
  // price: string
  // change: string
  isUp: true
  // bid: string
  // ask: string
}