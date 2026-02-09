export interface Order {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  status: 'open' | 'pending' | 'closed'
  orderType: 'market' | 'limit'
  entryPrice: number
  exitPrice?: number
  lotSize: number
  stopLoss?: number
  takeProfit?: number
  pnl?: number
  openedAt: string
  closedAt?: string
}