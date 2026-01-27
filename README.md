# Exness Clone

This project is a learning-focused clone of the Exness trading platform, built to understand how an end-to-end web-based trading system works from order placement to execution logic and real-time price handling.

Exness is a popular online trading platform built on MetaTrader 5 (MT5) and offers trading across Forex, stocks, indices, ETFs, and cryptocurrencies using the Contract for Difference (CFD) model. Trades are executed in real time based on market prices.

### ⚠️ Disclaimer

This project doesn't involve any real money or real market executions.
It's not intended for actual trading and is purely built for learning purposes to avoid rules, regulations, and legal issues.

### 🧑‍💻 Tech Stack

1. Bun
2. Hono
3. Drizzle ORM
4. Next JS
5. Neon DB
6. Redis
7. Finnhub API

#### ❗️ Before we go over the backend, let's understand how trading works in this project, specially Contract-for-Difference (CFD) trading. Also what types of orders are supported in this Exness (clone).

#### Contract-for-Difference (CFD)
In CFD trading, users do not buy or own the actual asset.
Instead they trade a contract that represents a bet on the price movement of that asset.

- If a trader believes the price will go up, they place a Buy position.
- If the trader believes the price will go down, they place a Sell position.

**How profit & loss works**

- You enter a trade at a price
- You exit the trade at a later price
- Your profit or loss = difference between entry and exit price

**Examples:**

- Buy at 100 → Sell at 110 → Profit = +10
- Sell at 100 → Buy back at 90 → Profit = +10
- If the price moves against your prediction, you incur a loss

#### Types of orders available in Exness (clone)

1) **Market orders**
- Executed immediately at the current market price
- Used when the user wants instant entry or exit
- Simplest and fastest order type

2) **Limit orders**
- Executed only when the price reaches a specified level
- Remains pending until the trigger price is met
- Useful for entering trades at a better price

#### Order Triggers
Order triggers define when an order should be executed or closed based on price movements.
They are a core part of how trading platforms automate decision-making.

1) **Trigger Price**
    - Available only in Limit Orders
    - The price level at which a pending order becomes active
    - Used to enter a trade at a desired price, instead of the current market price

    Eg: 
    - Current price : `100`
    - Buy limit with trigger price: `95`
    - Order activates only when price ≤ 95

2) **Stop Loss**
- Available for Orders that are in `open` state 
- Automatically closes a trade when the price moves against the user
- Used to limit potential losses

    Rules
    - For Buy orders → Stop Loss should be below the entry price
    - For Sell orders → Stop Loss should be above the entry price

3) **Take Profit**
- Again only available for Orders that are in 'open' state
- Automatically closes a trade when a target profit is reached
- Used to lock in profits without manual intervention

    Rules:
    - For Buy orders → Take Profit should be above the entry price
    - For Sell orders → Take Profit should be below the entry price

#### Order Life Cycle 
(*PENDING → OPEN → CLOSED*)

1) PENDING
- Order has been created but not yet executed
- Applies mainly to Limit Orders
- The system waits for the trigger price to be reached
- Order is stored in Redis and continuously monitored

2) OPEN
- Order has been successfully executed
- Entry price is locked
- Trade is now live
- Stop Loss (SL) and Take Profit (TP) can be applied or modified

3) CLOSED
- Order has been exited
- Exit can happen due to:
    - Manual close by user
    - Stop Loss hit
    - Take Profit hit
- Profit or loss is calculated using:
 `PnL = Exit Price − Entry Price`


 #### Order Sides/Position

When you are placing a order there's two sides for traders to pick: 
`BUY` – Expecting the price to go up
`SELL` – Expecting the price to go down
This choice determines how profit and loss are calculated.

BUY Position
- You enter the trade at a price
- You profit if the price increases
- You lose if the price decreases

SELL Position
- You enter the trade at a price
- You profit if the price decreases
- You lose if the price increases
 

#### Finnhub API

- In this project, I have used Finnhub API *(free tier)* to fetch real-time market data. 
- Finnhub API is simple REST API, is reliable for real-time price feed and ideal for learning trading systems.
- You can get an API key from [here](https://finnhub.io/).

Also for the limited scope of the project, I have specified the trading to limited quantity of stocks, finance, ETFs and cryptocurrencies. The selected symbols can be found in

` '/backend/src/data/allsymbol.ts' `

### Backend Overview
Backend built using Bun JS, Drizzle ORM and Finnhub API.
How frontend, API, Redis, DB, and price engine interact

1. **API Layer**
- API is built using Hono.js
- Endpoints are as follows:
    1. auth - for user authentication
    2. users - for user management
    3. symbols - for fetching symbols to frontend
    4. wallets - for user wallets
    5. orders - for order management

2. **Web Socket Layer**
The WebSocket layer is responsible for real-time market price distribution and trigger-based order execution.
It acts as the bridge between external market data (Finnhub) and the internal trading engine.

Responsibilities
    - Maintain a live connection with Finnhub WebSocket API
    - Subscribe to active trading symbols dynamically
    - Broadcast real-time price updates to connected frontend clients
    - Trigger order execution based on price movements
    - Manage open and close positions in real time

****⚙️ Core Components****

🔹 **Finnhub WebSocket Connection**

- Establishes a persistent WebSocket connection to Finnhub
- Subscribes only to active symbols to reduce unnecessary data flow
- Receives continuous price updates for subscribed instruments

🔹 **Price Server (PriceServer.ts)**

- Runs a Bun WebSocket server on port 3001
- Accepts WebSocket connections from frontend clients
- Broadcasts latest prices to all subscribed clients
- Acts as the central hub for real-time price distribution

🔹 **Price Store**

- Maintains the latest price snapshot for each active symbol
- Ensures fast, in-memory access for:
- UI updates
- Trigger evaluation
- SL / TP checks

🔹 **Active Symbols**

Tracks symbols that currently have:
- Open orders
- Pending limit orders
- Prevents subscribing to unused symbols
- Optimizes Finnhub API usage

🔹 **Price Watchers**

Listeners that react to price updates per symbol.

Responsible for:
- Evaluating limit order trigger prices
- Checking Stop Loss / Take Profit conditions
- Routes valid executions to the order engine

🔹 **Open Position Order Handler**

- Executes orders once trigger conditions are met
- Moves orders from `PENDING → OPEN`
- Locks entry price and updates order state

🔹 **Close Position Order Handler**

Closes open positions when:
- Stop Loss is hit
- Take Profit is hit
- User manually closes the order
- Calculates PnL and finalizes order state
- Moves orders from OPEN → CLOSED


3. **Why Redis? How is it used?**

    Technically Redis is not really needed in this project. As a hobby project and sheer lack of predicted order volume generated in this clone project, I can use DB transactions for each order execution. But for the sake of learning, I have used Redis to demonstrate how it can be used in a real-world project. 

    Redis is used as an execution cache, not as the source of truth.

    Redis is used to cache in following Data Structure
    - SET: active symbols (of the active orders)
    - ZSET: trigger prices of each limit orders
    - ZSET: Stop Loss & Take Profit prices of each limit orders

    Examples as follows:
    - `SET active:symbol AAPL` 
    - `ZADD trigger:AAPL:buy {triggerPrice} {orderId}`
    - `ZADD sl:AAPL:sell {stopLoss} orderId`

4. **Order Execution Flow**

    User Places an Order:
    → Order is Validated & stores in DB
    → Redis cache updated
    → WebSocket price update arrives
    → Trigger evaluated
    → Order opened / closed
    → DB updated
    → Frontend notified
