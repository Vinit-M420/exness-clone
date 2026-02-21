export interface Order {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  status: 'open' | 'pending' | 'closed'
  orderType: 'market' | 'limit'
  triggerPrice: number
  entryPrice: number
  exitPrice?: number | null
  lotSize: number
  stopLoss?: number | null
  takeProfit?: number | null
  pnl: number | null
  openedAt: string
  closedAt: string
  createdAt: string
}
