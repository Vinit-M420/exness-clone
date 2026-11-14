import type { Page, Route } from "@playwright/test"
import type { Order } from "@/types/orderInterface"

export const SYMBOL = "BINANCE:BTCUSDT"

export function makeOrder(over: Partial<Order> = {}): Order {
  return {
    id: crypto.randomUUID(),
    symbol: SYMBOL,
    side: "buy",
    status: "open",
    orderType: "market",
    triggerPrice: 0,
    entryPrice: 97000,
    exitPrice: null,
    lotSize: 0.01,
    stopLoss: null,
    takeProfit: null,
    pnl: null,
    openedAt: new Date().toISOString(),
    closedAt: "",
    createdAt: new Date().toISOString(),
    ...over,
  }
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })

// Mocks every authenticated REST call the dashboard makes. `orders` is a live
// array - mutate it in a test and the next 3s poll of /order/all picks it up.
// Candle history is passed through to the real backend (read-only).
export async function mockApi(page: Page, orders: Order[]) {
  const state = {
    orders,
    marketStatus: 201,
    marketBody: { message: "Order placed" } as unknown,
  }

  await page.addInitScript(() => {
    localStorage.setItem("token", "e2e-token")
    localStorage.setItem("openSymbols", JSON.stringify(["BINANCE:BTCUSDT"]))
  })

  await page.route(/\/api\/v1\/(?!candles)/, (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace("/api/v1", "")
    const method = route.request().method()

    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: corsHeaders })
    if (path === "/wallet/get") return json(route, { response: { balance: "10000.00", currency: "USD" } })
    if (path === "/user/watchlist") return json(route, { symbolList: [{ symbol: SYMBOL, orderIndex: 0 }] })
    if (path === "/order/all") return json(route, { orders: state.orders })
    if (path === "/order/market" && method === "POST") return json(route, state.marketBody, state.marketStatus)
    if (path === "/order/limit" && method === "POST") return json(route, { message: "Order placed" }, 201)
    return json(route, { message: "ok" })
  })

  return state
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "*",
}
