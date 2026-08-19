# Exness Clone — Work Plan

Tracking doc for closing gaps between the current implementation and the real
Exness UI/behavior. Two audits feed this list:
1. Candle chart correctness audit (backend + frontend), 2026-08-17.
2. UI gap analysis vs. a real Exness screenshot, 2026-08-17.

Work through items top to bottom within each section unless noted. Check items
off as they land. Each item is scoped to be a single focused session with
Claude — mention the item name and it has enough context to pick up.

---

## A. Candle chart correctness (backend)

- [x] **A1. Guard against out-of-order/late trades** in candle bucketing.
      Fixed as part of A3's atomic rewrite: `candleStore.tsx`'s
      `applyTrade` Lua script now drops any trade whose minute bucket is
      older than the current candle's (`event: "ignored"`) instead of
      reopening/corrupting it.
- [x] **A2. Add TTL / time-based pruning to Redis candle keys.**
      `candle:current:*` gets a 24h TTL, `candle:history:*` a 7-day TTL,
      both refreshed on every write inside the same Lua script
      (`CURRENT_CANDLE_TTL_SECONDS` / `HISTORY_TTL_SECONDS` in
      `candleStore.tsx`). Count-based trim (100) kept as-is.
- [x] **A3. Fix read-then-write race on current candle.**
      Replaced the plain GET/SET pair with a single atomic `EVAL` (Lua
      script `APPLY_TRADE_SCRIPT` in `candleStore.tsx`, invoked via
      `applyTrade()`) that does the out-of-order check, OHLC update,
      history push+trim, and TTLs all server-side in one round trip.
      `candleEngine.tsx`'s `processTrade` is now a thin wrapper around it.
      **Needs manual verification against a live Redis** — no Lua
      interpreter/Redis available in the sandbox this was written in;
      `bunx tsc --noEmit` passes but the script itself is unexercised.
- [x] **A4. Add try/catch around `processTrade` per-trade.**
      Added in `backend/src/handler/tradeHandler.tsx` (the active handler
      imported by `ws/finnhub.ts`) — one bad trade now logs and lets the
      batch continue. Dead file `backend/src/candles/tradeHandler.tsx`
      left untouched.
- [x] **A5. Resubscribe active symbols after Finnhub reconnect.**
      `backend/src/ws/finnhub.ts`'s `onopen` now reads `active:symbols`
      from Redis and re-subscribes on every connect (initial boot *and*
      reconnect), not just when a new frontend client happens to connect.
- [x] **A6. Validate `symbol`/`limit` in candles route.**
      `backend/src/routes/candles.ts` now validates `symbol` against the
      shared `SymbolEnum` (from `schemas/market_order.ts`) and `limit`
      (integer, 1–500) via `HttpStatusCode.BadRequest` on failure.
      `response.count` now reflects the actually-returned slice length.
- [x] **A7. Multi-timeframe candle support (1m/5m/15m/30m/1h/4h/1D).**
      Storage stays 1-minute-only (unchanged from A1-A6); higher
      timeframes are rolled up on read. New `backend/src/candles/aggregate.tsx`
      (`aggregateCandles`) buckets ascending 1m candles into
      `intervalMinutes` buckets. `routes/candles.ts` gained an `interval`
      query param (validated against `ALLOWED_INTERVALS_MINUTES`) and
      aggregates `history + current` before slicing to `limit`. Bumped
      `HISTORY_LIMIT` in `candleStore.tsx` from 100 to 1500 (~25h of 1m
      candles) so higher timeframes have enough raw data to roll up from —
      still thin for 4h/1D (a handful of buckets), a known limitation of
      deriving-on-read rather than maintaining separate live aggregates
      per timeframe.

## B. Candle chart correctness (frontend)

- [x] **B1. Stop resetting zoom/pan on every live tick.**
      `CandleChart.tsx` now tracks a `renderModeRef` ('full' vs
      'incremental'). History loads and symbol switches still do
      `setData()` + `fitContent()`; live WS ticks (new bar or update to
      the last bar) now call `series.update()` instead, so the user's
      zoom/pan is no longer reset on every trade. Also fixed a related bug
      found while doing this: switching symbols left the previous symbol's
      candles on screen until new data arrived — the render effect now
      calls `setData([])` when `chartData` goes empty.
- [x] **B2. Add WS auto-reconnect** to the chart's own socket connection.
      `CandleChart.tsx`'s WS effect now retries with a 2s delay on close
      (mirrors the backend's Finnhub reconnect pattern), guarded by a
      `cancelled` flag so it stops cleanly on symbol change/unmount.
- [ ] **B3. Reuse the shared price-store WebSocket** instead of opening an
      independent connection in `CandleChart.tsx` — dedupe against
      `components/dashboard/hooks/usePriceStoreHook.ts`.
      **Scope turned out bigger than originally written**: there is no
      existing shared/singleton connection to dedupe against —
      `InstrumentsPanel.tsx` and `OrderPlacingPanel.tsx` each independently
      call `usePriceStore()`, so the app already opens 2 backend WS
      connections before `CandleChart.tsx`'s own (3 total). A real fix
      means lifting `usePriceStore()` up to `app/dashboard/page.tsx` and
      passing `tickers`/`subscribe`/`unsubscribe` down as props to all
      three consumers (consistent with this codebase's existing
      prop-drilling pattern per CLAUDE.md), plus extending the hook to
      also parse and expose `candle`-type messages so `CandleChart` can
      consume it instead of raw trade ticks. That's a 4-file behavioral
      change I haven't made yet — flagged for a scoping decision before
      starting.

## C. Chart toolbar (currently ~zero coverage)

- [x] **C1. Timeframe selector.** `CandleChart.tsx` toolbar has a
      Select (1m/5m/15m/30m/1h/4h/1D) backed by A7. History refetches with
      `&interval=`; live 1m WS ticks are rolled up client-side into the
      selected bucket size via `bucketTimeMs()` (a `timeframeRef` avoids
      stale closures in the WS handler, and the WS connection itself isn't
      torn down on timeframe change — only history refetches).
- [x] **C2. Indicators button.** Popover with two toggleable SMA overlays
      (SMA 20, SMA 50) — `computeSMA()` recomputed client-side from
      `chartData`, rendered as `addLineSeries()` lines created/removed as
      toggled. Deliberately just 2 fixed-period SMAs, not a general
      indicator engine.
- [x] **C3. Overlay symbol comparison.** "Compare" popover (search over
      `AllSymbols_Metadata`, chip + remove, "Ok" to close) matching the
      real Exness popover. Selected symbol's history is fetched at the
      same timeframe, normalized to % change from its first candle, and
      plotted as a line on a separate left price scale (shown only while
      a compare symbol is active). **Scoped down**: refreshes on
      selection/timeframe change but is not live-ticked per trade (no WS
      subscribe for the overlay symbol) — kept out to avoid a second live
      data path; revisit if live overlay updates are wanted.
- [x] **C4. Save / screenshot controls.** "Save" persists
      `{timeframeMinutes, smaPeriods, overlaySymbol}` to
      `localStorage` per symbol (`chartPrefs:<symbol>`), loaded back on
      symbol switch. Screenshot button uses `chart.takeScreenshot()` →
      canvas → `toBlob` → triggers a real browser download (this is the
      actual running app, not an Artifact, so a download link is fine).
- [x] **C5. OHLC readout + %-change.** Top-left overlay shows O/H/L/C of
      the last candle plus %-change (close vs. open of that bar). The
      dashed current-price line with price tag turned out to already be
      lightweight-charts' *default* behavior (`priceLineVisible: true`,
      `priceLineStyle: LineStyle.Dashed` by default) — just made it
      explicit on the series options instead of leaving it implicit.

## D. Top bar

- [x] **D1. Multi-symbol tabs.** Added `openSymbols: string[]` state in
      `app/dashboard/page.tsx` (persisted to `localStorage`), kept in sync
      with `selectedSymbol` via an effect rather than changing any child
      prop signatures — `InstrumentsPanel`/`OrderPlacingPanel`/`CandleChart`
      still just receive `selectedSymbol`/`setSelectedSymbol` as before.
      `Navbar` renders a tab strip (click to switch, hover to close, "+"
      opens a symbol-search popover to open a new tab) via new optional
      props (`openSymbols`, `activeSymbol`, `onSelectSymbol`,
      `onCloseSymbol`, `onAddSymbol`) that only render when passed — the
      landing/login/signup pages call `<Navbar />` with no props and are
      unaffected.
- [x] **D2. Account selector.** Static "Real Standard" label + live
      balance, fetched once via `GET /api/v1/wallet/get` in `page.tsx` and
      passed down as `walletBalance`. No Real/Demo switching (not backed
      by anything server-side) — deliberately just a display, not a fake
      interactive dropdown.
- [x] **D3. History/layout/settings icons, avatar, Deposit button.**
      History/Layout/Settings are unwired icon buttons (chrome-only,
      consistent with existing unwired icons already in
      `InstrumentsPanel.tsx`/`OrdersTab.tsx`). Avatar has a dropdown with
      a **functional** Log out (clears the token, redirects to `/login`)
      rather than being pure decoration. Deposit opens a no-op `Dialog`
      explaining deposits aren't wired to a real payment provider, per
      CLAUDE.md's no-real-money constraint.

## E. Fixes / smaller items

- [x] **E1. Fix fake buy/sell split percentage.** There's no real
      order-book depth available from a trade-tick feed, so replaced
      `Math.random()` with a non-random proxy: `usePriceStoreHook.ts` now
      tracks a `buyRatio` EMA per symbol (buy tick → nudge up, sell tick →
      nudge down, neutral → unchanged), and `OrderPlacingPanel.tsx` derives
      `buyPercentage` from it (clamped 20-80 for display sanity). Added
      `buyRatio` to the `Ticker` type.
- [x] **E2. Wire up bulk actions in Open/Pending/Closed header icons.**
      The `MoreVertical` icon in `OrdersTab.tsx` is now a real dropdown
      with one contextual bulk action: "Close all open positions" /
      "Cancel all pending orders" / "Clear closed history" depending on
      the active tab, reusing the existing per-order close/delete
      handlers. `Settings` and the standalone `X` are left as unwired
      chrome — no real "settings" or "collapse" feature exists to wire
      them to.
- [x] **E3. "Regular form" order-mode label.** Investigated per the
      original note: only one order-form layout exists in this app, so
      rather than build a dropdown with a single, permanently-selected
      option, added it as a plain text label above the Sell/Buy cards in
      `OrderPlacingPanel.tsx` — matches the screenshot visually without
      faking a picker that has nothing to pick.
- [x] **E4. Instruments panel polish.** Re-checked on current code: the
      Signal indicator in `SortableRow.tsx` (lines 94-104) already renders
      correctly (colored up/down triangle from `ticker.signal`) — the
      original audit finding was stale, no fix needed. Skipped the
      "settings moved here" banner since there's no real relocated
      settings panel to point users to; adding it would be misleading.

---

## Suggested order of attack

1. A1–A6 (backend candle correctness — low risk, high value, no UI change)
2. B1–B3 (frontend candle correctness/perf)
3. E1 (quick correctness fix, unrelated to the rest — do anytime)
4. A7 (multi-timeframe backend) → C1 (timeframe selector UI)
5. C5, C2–C4 (remaining chart toolbar features)
6. D1–D3 (top bar / multi-tab — bigger state-model change)
7. E2–E4 (remaining polish)

## Notes

- No automated test suite exists (see CLAUDE.md → Verification). Each item
  needs manual verification: `bun run dev:all` from repo root, exercise the
  dashboard, confirm behavior.
- Don't touch `backend/src/candles/tradeHandler.tsx` (confirmed dead code,
  per CLAUDE.md) except to reference its per-trade error handling pattern
  for A4.
- Full source audits this list was derived from are in the conversation
  history (2026-08-17) — re-run a fresh Explore-agent audit if this file
  goes stale before resuming.
