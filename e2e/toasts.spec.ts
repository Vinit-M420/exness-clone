import { expect, test, type Page } from "@playwright/test"
import { makeOrder, mockApi } from "./mockApi"

const toast = (page: Page, title: string) =>
  page.locator("[data-sonner-toast]").filter({ has: page.locator("[data-title]", { hasText: title }) })

// --exness-success / --exness-error / --exness-card from globals.css
const GREEN = "rgb(0, 217, 126)"
const RED = "rgb(255, 71, 87)"
const CARD = "rgb(20, 24, 41)"

async function accentOf(page: Page, title: string) {
  return toast(page, title).evaluate((el) => {
    const s = getComputedStyle(el)
    return { bg: s.backgroundColor, accent: s.borderLeftColor }
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto("about:blank")
})

test("market order toasts use the dashboard palette and don't cover Buy/Sell", async ({ page }) => {
  const api = await mockApi(page, [])
  await page.goto("/dashboard")

  const buy = page.getByRole("button", { name: "Buy", exact: true })
  const sell = page.getByRole("button", { name: "Sell", exact: true })

  await buy.click()
  await expect(toast(page, "Market order placed")).toBeVisible()
  expect(await accentOf(page, "Market order placed")).toEqual({ bg: CARD, accent: GREEN })

  // A visible toast must not block a second order (it used to sit on top of
  // these buttons) - a plain click fails if anything intercepts it.
  api.marketStatus = 400
  api.marketBody = { message: "Insufficient balance" }
  await sell.click({ timeout: 3000 })
  const rejected = toast(page, "Order rejected")
  await expect(rejected).toBeVisible()
  await expect(rejected.locator("[data-description]")).toHaveText("Insufficient balance")
  expect(await accentOf(page, "Order rejected")).toEqual({ bg: CARD, accent: RED })

  await page.screenshot({ path: "e2e-out/toasts-actions.png" })
})

test("polling toasts limit fills, take profit and stop loss", async ({ page }) => {
  const limit = makeOrder({ status: "pending", orderType: "limit", triggerPrice: 96000, entryPrice: 0 })
  const tpOrder = makeOrder({ takeProfit: 98000, stopLoss: 95000 })
  const slOrder = makeOrder({ side: "sell", takeProfit: 95000, stopLoss: 99000 })
  const orders = [limit, tpOrder, slOrder]
  await mockApi(page, orders)
  await page.goto("/dashboard")
  await expect(page.getByText("Market", { exact: true }).first()).toBeVisible()

  // Existing orders must not toast on page load
  await page.waitForTimeout(1500)
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0)

  // Backend fills / closes them between two polls
  Object.assign(limit, { status: "open", entryPrice: 96000 })
  Object.assign(tpOrder, { status: "closed", exitPrice: 98010, pnl: 10.1 })
  Object.assign(slOrder, { status: "closed", exitPrice: 99005, pnl: -20.05 })

  await expect(toast(page, "Limit order filled")).toBeVisible({ timeout: 5000 })
  await expect(toast(page, "Take profit hit")).toContainText("PnL +$10.10")
  await expect(toast(page, "Stop loss hit")).toContainText("PnL -$20.05")
  expect((await accentOf(page, "Take profit hit")).accent).toBe(GREEN)
  expect((await accentOf(page, "Stop loss hit")).accent).toBe(RED)

  await page.locator("[data-sonner-toast][data-front=\"true\"]").hover()
  await page.screenshot({ path: "e2e-out/toasts-poll.png" })

  // Each change toasts once, not on every poll
  await page.mouse.move(0, 0)
  await page.waitForTimeout(3500)
  await expect(toast(page, "Take profit hit")).toHaveCount(1)
})
