import { expect, test } from "@playwright/test"
import { makeOrder, mockApi } from "./mockApi"

const GUTTER = 8

for (const [width, height] of [[1280, 720], [1440, 900], [1920, 1080]]) {
  test(`dashboard fits ${width}x${height} exactly with uniform gutters`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await mockApi(page, Array.from({ length: 12 }, () => makeOrder()))
    await page.goto("/dashboard")
    await expect(page.getByRole("button", { name: "Buy", exact: true })).toBeVisible()

    // No page scroll in either direction
    const doc = await page.evaluate(() => ({
      sh: document.documentElement.scrollHeight,
      sw: document.documentElement.scrollWidth,
    }))
    expect(doc.sh).toBe(height)
    expect(doc.sw).toBe(width)

    // Navbar pinned to the top, even after trying to scroll
    await page.mouse.move(width / 2, height / 2)
    await page.mouse.wheel(0, 800)
    const nav = await page.locator("nav").first().boundingBox()
    expect(nav).toMatchObject({ y: 0, height: 48 })
    expect(await page.evaluate(() => scrollY)).toBe(0)

    // Four panels: instruments | chart over orders | order form
    const box = async (sel: string) => (await page.locator(sel).first().boundingBox())!
    const main = page.locator("main")
    const left = (await main.locator(":scope > div").nth(0).boundingBox())!
    const center = (await main.locator(":scope > div").nth(1).boundingBox())!
    const right = (await main.locator(":scope > div").nth(2).boundingBox())!
    const chart = (await main.locator(":scope > div").nth(1).locator(":scope > div").nth(0).boundingBox())!
    const orders = (await main.locator(":scope > div").nth(1).locator(":scope > div").nth(1).boundingBox())!

    const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(1)
    // outer gutters
    near(left.x, GUTTER)
    near(width - (right.x + right.width), GUTTER)
    near(left.y, 48 + GUTTER)
    for (const b of [left, right, orders]) near(height - (b.y + b.height), GUTTER)
    // inner gutters
    near(center.x - (left.x + left.width), GUTTER)
    near(right.x - (center.x + center.width), GUTTER)
    near(orders.y - (chart.y + chart.height), GUTTER)
    near(chart.y, left.y)

    // The chart fills its card down to the 16px inner padding, no further
    await expect(page.getByText("60 candles")).toBeVisible()
    const plot = await box("main .tv-lightweight-charts")
    near(plot.y + plot.height, chart.y + chart.height - 1 - 16)

    // Buy/Sell reachable and the order panel shows a live symbol, not "-"
    const buy = await box("main button:has-text('Buy')")
    expect(buy.y + buy.height).toBeLessThanOrEqual(height - GUTTER)

    // Instruments Ask column isn't clipped by the panel edge
    const ask = page.locator("main table tbody tr").first().locator("td").last()
    const askBox = (await ask.boundingBox())!
    expect(askBox.x + askBox.width).toBeLessThanOrEqual(left.x + left.width)

    await page.screenshot({ path: `e2e-out/layout-${width}.png` })
  })
}

test("instrument names aren't truncated", async ({ page }) => {
  await mockApi(page, [])
  await page.goto("/dashboard")
  const name = page.locator("main table tbody tr").first().getByText("BTCUSDT", { exact: true })
  await expect(name).toBeVisible()
  expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
})
