# Exness Clone

This project is a learning-focused clone of the Exness trading platform, built to understand how an end-to-end web-based trading system works from order placement to execution logic and real-time price handling.

Exness is a popular online trading platform built on MetaTrader 5 (MT5) and offers trading across Forex, stocks, indices, ETFs, and cryptocurrencies using the Contract for Difference (CFD) model. Trades are executed in real time based on market prices.

### ⚠️ Disclaimer

This project doesn't involve any real money or real market executions.
It's not intended for actual trading and is purely built for learning purposes to avoid rules, regulations, and legal issues.


### Tech Stack

1. Bun
2. Hono
3. Drizzle ORM
4. Next JS
5. Neon DB
6. Redis
7. Finnhub API


#### Before we go over the backend, let's understand how trading works in this project, specially Contract-for-Difference (CFD) trading. Also what types of orders are supported in this Exness (clone).

#### Contract-for-Difference (CFD)
In CFD trading, users do not buy or own the actual asset.
Instead they trade a contract that represents a bet on the price movement of that asset.

- If a trader believes the price will go up, they place a Buy position.
- If the trader believes the price will go down, they place a Sell position.

How profit & loss works

- You enter a trade at a price
- You exit the trade at a later price
- Your profit or loss = difference between entry and exit price

Examples:

- Buy at 100 → Sell at 110 → Profit = +10
- Sell at 100 → Buy back at 90 → Profit = +10
- If the price moves against your prediction, you incur a loss

#### Types of orders available in Exness (clone)

1) Market orders
- Executed immediately at the current market price
- Used when the user wants instant entry or exit
- Simplest and fastest order type

2) Limit orders
- Executed only when the price reaches a specified level
- Remains pending until the trigger price is met
- Useful for entering trades at a better price
