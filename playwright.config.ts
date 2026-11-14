import { defineConfig, devices } from "@playwright/test"

// UI tests for the dashboard. The REST API is mocked per test (see
// e2e/mockApi.ts), so no orders or wallets are written to the real DB.
// By default runs against the dev server on :3000 (started if not running);
// set E2E_BASE_URL to test another instance, e.g. a production build:
//   bun run build && bun run start -p 3100
//   E2E_BASE_URL=http://localhost:3100 bunx playwright test
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "bun run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
})
