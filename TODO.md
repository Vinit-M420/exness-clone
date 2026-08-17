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
- [ ] **A7. Multi-timeframe candle support (1m/5m/15m/1h/etc).**
      Currently hardcoded to 1-minute buckets everywhere in
      `candleEngine.tsx`/`candleStore.tsx`/`routes/candles.ts`. This is a
      bigger change — needed before the frontend timeframe selector (C1)
      can be real rather than cosmetic. Do this before C1.

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

- [ ] **C1. Timeframe selector** (1m/5m/15m/1h/4h/1D). Depends on A7
      landing first — otherwise it's a dropdown with no real backing data.
- [ ] **C2. Indicators button** ("f(x)") — start with 1-2 simple overlays
      (e.g. moving average) rather than a full indicator engine.
- [ ] **C3. Overlay symbol comparison** — popover to add a second symbol's
      price series onto the same chart for comparison.
- [ ] **C4. Save / screenshot controls** — chart layout save (localStorage
      is fine for a learning project) and a PNG export via
      lightweight-charts' built-in screenshot API.
- [ ] **C5. OHLC readout + %-change** at top-left of chart, and a dashed
      current-price line with price tag on the right edge (both supported
      natively by lightweight-charts, just not configured yet).

## D. Top bar

- [ ] **D1. Multi-symbol tabs.** Support multiple simultaneously "open"
      instrument tabs (like browser tabs) instead of a single
      `selectedSymbol` string in `app/dashboard/page.tsx`. This is a state
      model change — plan it before touching layout/CSS.
- [ ] **D2. Account selector** ("Real/Demo, Standard, balance") — even a
      static/mocked version tied to the wallet data already in the schema.
- [ ] **D3. History icon, layout icon, settings gear, avatar, Deposit
      button** — mostly UI scaffolding; Deposit can be a no-op modal for
      now (no real payments — see CLAUDE.md, this is a learning project).

## E. Fixes / smaller items

- [ ] **E1. Fix fake buy/sell split percentage.**
      `components/dashboard/OrderPlacingPanel.tsx` (~lines 39-44)
      currently randomizes the sell/buy split bar via `Math.random()`
      instead of deriving it from real spread/depth data. This is a
      correctness bug more than a missing feature — quick win.
- [ ] **E2. Wire up bulk actions in Open/Pending/Closed header icons.**
      `components/dashboard/OrdersTab.tsx` renders settings/more/X icons
      (~lines 173-181) with no behavior — add close-all/delete-all/
      visibility-toggle.
- [ ] **E3. "Regular form" order-mode dropdown** in
      `OrderPlacingPanel.tsx` — investigate what alternate modes real
      Exness offers (e.g. one-click trading) before building; may be a
      "nice to have" vs. core.
- [ ] **E4. Instruments panel polish** — remove/replace the unused
      Signal-column indicator (header exists, no value renders per row),
      and the "settings moved here" collapse banner if wanted.

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
