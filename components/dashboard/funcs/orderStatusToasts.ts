import { toast } from "sonner"
import { Order } from "@/types/orderInterface"

export type OrderEvent =
  | { kind: "limit_filled"; order: Order }
  | { kind: "stop_loss" | "take_profit"; order: Order }

export const displaySymbol = (symbol: string) => symbol.split(":").pop() ?? symbol

const fmt = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 5 })

const fmtPnl = (pnl: number | string | null) => {
  const n = Number(pnl ?? 0)
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`
}

// Work out what the backend did between two polls. Only engine-driven changes
// count: pending -> open is always a limit fill; open -> closed is SL/TP only
// when the exit price is at/through that level (manual closes get their own
// toast from the close action, so they're skipped here).
export function diffOrders(prev: Map<string, Order["status"]>, next: Order[]): OrderEvent[] {
  const events: OrderEvent[] = []

  for (const order of next) {
    const before = prev.get(order.id)
    if (!before || before === order.status) continue

    if (before === "pending" && order.status === "open") {
      events.push({ kind: "limit_filled", order })
    } else if (before === "open" && order.status === "closed") {
      const exit = Number(order.exitPrice)
      const sl = order.stopLoss != null ? Number(order.stopLoss) : null
      const tp = order.takeProfit != null ? Number(order.takeProfit) : null
      const isBuy = order.side === "buy"

      if (sl !== null && (isBuy ? exit <= sl : exit >= sl)) events.push({ kind: "stop_loss", order })
      else if (tp !== null && (isBuy ? exit >= tp : exit <= tp)) events.push({ kind: "take_profit", order })
    }
  }

  return events
}

export function showOrderEventToast(event: OrderEvent) {
  const { order } = event
  const what = `${order.side === "buy" ? "Buy" : "Sell"} ${fmt(order.lotSize)} ${displaySymbol(order.symbol)}`

  if (event.kind === "limit_filled") {
    toast.success("Limit order filled", { description: `${what} opened @ ${fmt(order.entryPrice)}` })
  } else if (event.kind === "take_profit") {
    toast.success("Take profit hit", { description: `${what} closed @ ${fmt(order.exitPrice)} · PnL ${fmtPnl(order.pnl)}` })
  } else {
    toast.error("Stop loss hit", { description: `${what} closed @ ${fmt(order.exitPrice)} · PnL ${fmtPnl(order.pnl)}` })
  }
}
