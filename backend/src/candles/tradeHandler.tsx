
import { processTrade } from "./candleEngine";
import type { CandleUpdate } from "../types/candleType";

/**
 * Finnhub Trade Format
 * 
 * Fields from Finnhub WebSocket:
 * - s: symbol (string) e.g., "AAPL"
 * - p: price (number) e.g., 150.25
 * - v: volume (number) e.g., 100
 * - t: timestamp (number) milliseconds e.g., 1234567890000
 * - c: conditions (array) - we ignore this
 */
interface FinnhubTrade {
  s: string;  // symbol
  p: number;  // price
  v: number;  // volume
  t: number;  // timestamp in milliseconds
}

/**
 * Handle incoming trades from Finnhub and generate candle updates
 * 
 * FLOW:
 * 1. Finnhub sends WebSocket message with trades
 * 2. priceServer.ts calls this function
 * 3. This function processes each trade
 * 4. Returns array of candle updates
 * 5. priceServer broadcasts updates to all connected clients
 * 
 * INPUT EXAMPLE:
 * [
 *   { s: "AAPL", p: 150.25, v: 100, t: 1234567845000 },
 *   { s: "AAPL", p: 150.30, v: 50,  t: 1234567846000 },
 *   { s: "TSLA", p: 250.00, v: 200, t: 1234567847000 }
 * ]
 * 
 * OUTPUT EXAMPLE:
 * [
 *   { 
 *     type: "candle", 
 *     symbol: "AAPL", 
 *     event: "update",
 *     candle: { time: 1234567800000, open: 150.00, high: 150.30, ... }
 *   },
 *   { 
 *     type: "candle", 
 *     symbol: "TSLA", 
 *     event: "new",
 *     candle: { time: 1234567800000, open: 250.00, high: 250.00, ... }
 *   }
 * ]
 */
export async function handleTrades(trades: FinnhubTrade[]): Promise<CandleUpdate[]> {
  
  // Guard clause: Return empty array if no trades
  if (!trades || trades.length === 0) {
    return [];
  }

  // Array to collect all candle updates
  const updates: CandleUpdate[] = [];

  // Process each trade sequentially
  // WHY SEQUENTIAL (not parallel)?
  // - Trades for the same symbol must be processed IN ORDER
  // - Trade at 10:30:45 must be processed before trade at 10:30:46
  // - Otherwise candle data will be wrong
  for (const trade of trades) {
    try {
      // Process single trade through candle engine
      const result = await processTrade(
        trade.s,  // symbol
        trade.p,  // price
        trade.v,  // volume
        trade.t   // timestamp
      );

      // If candle was updated/created, add to updates array
      if (result) {
        updates.push(result);
      }
      
    } catch (error) {
      // Log error but continue processing other trades
      // Don't let one bad trade break the entire batch
      console.error(`❌ Error processing trade for ${trade.s}:`, error);
    }
  }

  // Return all updates to be broadcast
  return updates;
}

/**
 * WHY ASYNC?
 * 
 * - processTrade() is async (reads/writes to Redis)
 * - We need to await each trade processing
 * - Redis operations are I/O bound (network calls)
 * 
 * PERFORMANCE NOTE:
 * - This processes trades one-by-one (sequential)
 * - For high-frequency trading, you might optimize with batching
 * - Current approach is simple and correct
 */

/**
 * EXAMPLE USAGE IN priceServer.ts:
 * 
 * finnhubSocket.onmessage = async (event) => {
 *   const msg = JSON.parse(event.data);
 *   
 *   if (msg.type === "trade") {
 *     // Process trades and get candle updates
 *     const candleUpdates = await handleTrades(msg.data);
 *     
 *     // Broadcast to all connected clients
 *     for (const update of candleUpdates) {
 *       broadcastToClients(update);
 *     }
 *   }
 * };
 */

/**
 * OPTIMIZATION OPPORTUNITIES (Future):
 * 
 * 1. Batch Redis Writes
 *    - Instead of writing each candle update separately
 *    - Collect all updates and write in one transaction
 * 
 * 2. Deduplication
 *    - If same symbol has multiple trades
 *    - Only broadcast the FINAL state, not every update
 * 
 * 3. Throttling
 *    - Limit updates to 1 per second per symbol
 *    - Reduces WebSocket bandwidth
 * 
 * Current implementation prioritizes CORRECTNESS over performance.
 * For your trading platform scale, this is perfectly fine.
 */