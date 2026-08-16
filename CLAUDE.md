# Project Overview

Exness Clone — a learning project simulating a CFD trading platform (market/limit orders, stop loss / take profit, real-time price feed from Finnhub). No real money or execution; not for production use.

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS 4, shadcn/ui (`components/ui`), `lightweight-charts` for candles.
- **Backend** (`backend/`): Bun + Hono API, Drizzle ORM over Postgres (Neon serverless driver), Redis (Bun's built-in `RedisClient`) as an order-trigger cache, Finnhub WebSocket as the market data source.
- **Package manager**: Bun (`bun.lock` present at root and in `backend/`; no npm/yarn/pnpm lockfiles). Two independent Bun/Node projects in one repo — root (frontend) and `backend/` (API + WS + price engine) — each with its own `package.json` and must be run separately.
- **Runtime requirement**: Bun (for backend, and for `bun install`/scripts); Node-compatible runtime for Next.js dev/build.

# Repository Structure

```
app/                      Next.js App Router pages (dashboard, login, signup, layout)
components/dashboard/     Trading UI: InstrumentsPanel, OrderPlacingPanel, OrdersTab, CandleChart
components/dashboard/funcs/   Pure helpers (deriveSignal, deriveAskBid, sensors, SortableRow) + updateWatchlistOnServer (API call)
components/dashboard/hooks/   usePriceStoreHook.ts — owns the frontend WS connection to the backend price server (port 3001) and derives ticker state
components/ui/            shadcn/ui primitives (new-york style, see components.json)
types/                    Shared frontend TS interfaces (order, position, symbol, ticker)
data/                     Symbol lists (allsymbols, topsymbols), spread config, mock data — imported by both frontend and backend (cross-project import)
lib/utils.ts              `cn()` class-merge helper

backend/src/app.ts         Hono app: registers CORS + all route groups under /api/v1/*
backend/src/index.ts       HTTP server entrypoint (port 3002); also imports ws/priceServer as a side effect
backend/src/routes/        auth, user, wallets, symbols, orders, candles — one Hono router per resource
backend/src/db/schema.ts   Drizzle schema: users, users_watchlist, wallets, wallet_transactions, orders
backend/src/db/index.ts    Drizzle client (neon-serverless Pool + ws), exported as `db`
backend/src/redis/client.ts  Bun RedisClient singleton (redis://localhost:6379, not URL-configurable)
backend/src/ws/            Real-time engine: finnhub.ts (upstream WS), priceServer.ts (downstream WS server, port 3001), priceStore.ts (in-memory latest price), priceWatcher.ts (trigger/SL/TP evaluation), activeSymbols.ts, openPosition.ts, closePosition.ts
backend/src/handler/tradeHandler.tsx   Active trade-to-candle handler, used by ws/finnhub.ts
backend/src/candles/       candleEngine.tsx (candle aggregation), candleStore.tsx (Redis-backed candle storage)
backend/src/schemas/       Zod request schemas (market_order, user_schema, watchlist_schema) + HttpStatusCode enum
backend/drizzle/migrations/  Generated SQL migrations + snapshots (drizzle-kit)
backend/docker-compose.yml  Local Postgres + Adminer for dev
backend/test/               Ad-hoc manual scripts (not an automated test suite — see Verification)
```

# Development Commands

Run frontend and backend from their own directories; each needs its own `bun install`.

**Frontend (repo root)**
- Install: `bun install`
- Dev server: `bun run dev` (Next.js, default port 3000)
- Build: `bun run build`
- Start production build: `bun run start`
- Lint: `bun run lint` (ESLint via `eslint.config.mjs`, next/core-web-vitals + next/typescript)
- Format: Not configured (no Prettier config found)
- Type check: Not configured as a script — run `bunx tsc --noEmit` directly
- Tests: Not configured (no test runner/config in root `package.json`)

**Backend (`backend/`)**
- Install: `cd backend && bun install`
- Dev server: `bun --watch src/index.ts` (starts Hono API on port 3002 **and** the WS price server on port 3001, since `src/index.ts` imports `./ws/priceServer` as a side effect)
  - Note: the root `package.json` has a `backend` script (`bun --watch src/index.js`) that is stale/broken — wrong extension and wrong working directory. Run the command above from inside `backend/` instead.
- Build: Not configured (Bun runs TS directly; no build step defined)
- Lint: Not configured (no ESLint config in `backend/`)
- Format: Not configured
- Type check: Not configured as a script — run `bunx tsc --noEmit` from `backend/`
- Tests: Not configured as an automated suite. `backend/test/*.ts` are standalone manual scripts (e.g. `bun run test/redis_test.ts`, `bun run test/finnhub_test.ts`) that print output for manual inspection — they are not assertions and not wired into any test runner.
- DB migrations (Drizzle Kit, from `backend/`):
  - Generate migration from schema changes: `bunx drizzle-kit generate`
  - Apply migrations: `bunx drizzle-kit migrate`
  - Requires `DATABASE_URL` in `backend/.env`
- Local Postgres for dev: `docker compose up -d` (from `backend/`, uses `backend/docker-compose.yml`; also starts an Adminer UI on port 8080)

# Architecture

**Client/server boundary**: Next.js frontend (port 3000) talks to two separate backend processes:
1. Hono REST API on port 3002 (`NEXT_PUBLIC_API_BASE`) — auth, orders, wallet, symbols, candles history.
2. Raw Bun WebSocket server on port 3001 (`NEXT_PUBLIC_WS_API_BASE`) — live price ticks and candle updates only. `components/dashboard/hooks/usePriceStoreHook.ts` owns this connection; components subscribe/unsubscribe to symbols by sending `{type: "subscribe"|"unsubscribe", symbol}` over the socket.

**Auth**: JWT (`hono/jwt`), `HS256`, signed/verified with `JWT_SECRET`. Passwords hashed with `Bun.password` (bcrypt). Token issued on `/api/v1/auth/login`, stored in `localStorage` on the frontend (`token` key), sent as `Authorization: Bearer <token>`. Protected routers apply `jwt()` middleware on `"/*"` and read `c.get("jwtPayload")`; `orders.ts` additionally loads the user's wallet in middleware and sets `userId`/`walletId`/`walletBalance` on the Hono context (typed in `backend/src/types/hono.d.ts`).

**Order/trading data flow**:
1. Frontend places market/limit orders via `POST /api/v1/order/{market,limit}` (validated with Zod schemas in `backend/src/schemas/market_order.ts`).
2. Order writes happen inside a single `db.transaction` (order insert + wallet_transactions ledger row + wallet balance update) — always keep these three writes atomic when touching order logic.
3. Pending/limit triggers, plus SL/TP for open orders, are stored **only in Redis** as sorted sets keyed `trigger:<symbol>:<side>`, `sl:<symbol>:<side>`, `tp:<symbol>:<side>` (score = price, member = order id). Postgres is the source of truth for order state; Redis is a derived execution cache — the README explicitly says Redis is not strictly needed but is used for cache/learning purposes. When editing orders (`PUT /order/edit/:id`) or deleting them, the corresponding Redis entries must be kept in sync (see existing `zadd`/`zrem` calls).
4. `backend/src/ws/finnhub.ts` maintains the upstream Finnhub WS connection, subscribed only to symbols with active orders (`activeSymbols.ts` tracks the subscriber-count). Each incoming trade: updates `priceStore` (in-memory latest price), feeds `handleTrades` (→ candle aggregation in `candles/candleEngine.tsx`), and calls `priceWatcher(symbol, price)`.
5. `priceWatcher.ts` is the trigger engine: it scans the Redis sorted sets for the symbol and calls `openPosition` (pending → open) or `closePosition` (open → closed, computing PnL) as thresholds are crossed. Orders are removed from Redis *before* execution to avoid double-processing.
6. `priceServer.ts` (port 3001) rebroadcasts every Finnhub trade and every candle update verbatim to all connected frontend WS clients — it does not filter per-client by subscription, so all connected clients receive all subscribed-symbol data.

**Candles**: `backend/src/routes/candles.ts` (`GET /api/v1/candles/:symbol?limit=`) reads aggregated candle history from `candleStore.tsx` (Redis-backed), populated by `candleEngine.tsx` as trades arrive. `components/dashboard/CandleChart.tsx` renders this with `lightweight-charts`, refreshed live via the WS candle-update messages.

**State management**: No global store (no Redux/Zustand/Context providers found) — state lives in local `useState`/`useEffect` in page/component files, lifted only as far as `app/dashboard/page.tsx` and passed down as props (`orders`, `selectedSymbol`, `setTableRerender` trigger a manual refetch pattern instead of cache invalidation).

# Coding Conventions

- **Backend routers**: one Hono sub-router per resource under `backend/src/routes/`, mounted in `backend/src/app.ts` under `/api/v1/<resource>`. Auth-gated routers apply `jwt()` via `router.use("/*", jwt({...}))` at the top of the file.
- **Validation**: Zod schemas in `backend/src/schemas/`, parsed with `.safeParse()`; on failure return `{message, errors}` with `HttpStatusCode.BadRequest`. Reuse `HttpStatusCode` (`backend/src/schemas/http_response.ts`) instead of raw status numbers — most routes do, some newer ones (`edit`, `delete`) inconsistently use raw numbers; prefer the enum for new code.
- **Error handling**: route handlers wrap DB/transaction logic in `try/catch`, log with `console.error`, and return `{message, error}` JSON with an appropriate `HttpStatusCode`. Money-moving logic (order create/close) is wrapped in `db.transaction`.
- **DB access**: always via the Drizzle `db` singleton (`backend/src/db/index.ts`) and `drizzle-orm` query builders (`eq`, `and`, etc.) — no raw SQL in routes.
- **Symbols**: the canonical tradable-symbol list lives in `data/allsymbols.ts` (shared, imported by both frontend and backend via the `@/*` → root path alias) and is used to build the Zod `SymbolEnum`. Don't hardcode symbol strings elsewhere; extend that list.
- **Path aliases**: root `tsconfig.json` maps `@/*` to the repo root, so frontend code can (and does) import directly from `@/backend/src/...` (e.g. `components/dashboard/OrderPlacingPanel.tsx` imports the Drizzle `orders` table type). Be deliberate about this — it couples the frontend bundle to backend source; prefer importing only types/constants this way, not server-only runtime code (db clients, secrets).
- **Frontend components**: client components are explicitly marked `'use client'`. UI primitives come from `components/ui` (shadcn, "new-york" style, `cn()` from `lib/utils.ts` for class merging) — reuse these instead of adding new UI libraries.
- **TypeScript**: `strict: true` in both root and backend `tsconfig.json`. Backend source files mix `.ts` and `.tsx` extensions somewhat inconsistently (e.g. `candles/*.tsx`, `handler/tradeHandler.tsx` contain no JSX) — match the existing file's extension when editing it rather than renaming.
- **Env access**: frontend reads `process.env.NEXT_PUBLIC_API_BASE` / `NEXT_PUBLIC_WS_API_BASE` directly in components (no central config module). Backend reads `process.env.*` directly per-file with `dotenv/config` imported where needed.

# Feature Development Workflow

For any non-trivial change:
1. Inspect related code and existing patterns first (e.g. an existing route/handler/component of the same kind).
2. Explain the planned files and approach before editing.
3. Make the smallest consistent change.
4. Update or add tests where appropriate (note: no automated test runner exists today — see Verification).
5. Run the narrowest relevant checks first (e.g. `bunx tsc --noEmit` on the touched project).
6. Run the full validation commands when practical (`bun run lint`, `bunx tsc --noEmit` in both root and `backend/`).
7. Report changed files and verification results.

# Safety and Boundaries

- Never expose, commit, or print secrets. `.env` and `backend/.env` are gitignored — do not read secret values into output beyond what's needed, and never suggest committing them.
- Do not modify environment files containing secrets unless explicitly asked; when adding a new required var, update `backend/.env.example` (not `backend/.env`).
- Do not make broad refactors unless explicitly requested.
- Do not introduce a new dependency if an existing one can solve the problem (e.g. Zod, Drizzle, shadcn/ui, `lightweight-charts` are already in place).
- Do not change the `orders`/`wallets`/`wallet_transactions` schema or public API route shapes without calling out the impact — order execution logic (Redis keys, transaction flow, priceWatcher matching) depends on current field names and the pending→open→closed lifecycle.
- Preserve existing behavior unless the task explicitly requires changing it. In particular, don't silently "fix" the two-`tradeHandler` naming overlap (`backend/src/candles/tradeHandler.tsx` appears unused/dead; `backend/src/handler/tradeHandler.tsx` is the one actually imported by `ws/finnhub.ts`) without flagging it — confirm before deleting.

# Verification

- Frontend: `bun run lint` and `bunx tsc --noEmit` (root). Success = no ESLint errors, no TS errors. There is no automated test suite, so behavioral changes need manual verification (`bun run dev` and exercising the affected page).
- Backend: `bunx tsc --noEmit` (from `backend/`). Success = no TS errors. No lint config and no automated tests exist; `backend/test/*.ts` scripts only print output for manual eyeballing and require live Redis/Finnhub credentials to run meaningfully.
- Full stack manual check: `docker compose up -d` (Postgres, from `backend/`) + Redis running locally on 6379 + `bun --watch src/index.ts` (from `backend/`) + `bun run dev` (root), then confirm the dashboard loads, WS price ticks update, and placing a market order succeeds end-to-end.
- Limitation: no CI config found in the repo, and no automated test coverage exists for order logic, price-trigger matching, or auth — new logic in these areas is currently unverified by anything but manual testing.
