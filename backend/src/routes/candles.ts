import { Hono } from 'hono';
import { getSymbolData } from '../candles/candleStore';
import { aggregateCandles, ALLOWED_INTERVALS_MINUTES } from '../candles/aggregate';
import { SymbolEnum } from '../schemas/market_order';
import { HttpStatusCode } from '../schemas/http_response';
import type { Candle } from '../types/candleType';

const candlesRouter = new Hono();

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// GET /api/v1/candles/:symbol
// Example: GET /api/v1/candles/AAPL?limit=100&interval=15
candlesRouter.get('/:symbol', async (c) => {
  try {
    const symbol = c.req.param('symbol');
    const symbolResult = SymbolEnum.safeParse(symbol);
    if (!symbolResult.success) {
      return c.json(
        { message: 'Invalid symbol', errors: symbolResult.error.issues },
        HttpStatusCode.BadRequest
      );
    }

    const rawLimit = c.req.query('limit');
    const limit = rawLimit === undefined ? DEFAULT_LIMIT : Number(rawLimit);
    if (rawLimit !== undefined && (!Number.isInteger(limit) || limit <= 0 || limit > MAX_LIMIT)) {
      return c.json(
        { message: `limit must be an integer between 1 and ${MAX_LIMIT}` },
        HttpStatusCode.BadRequest
      );
    }

    const rawInterval = c.req.query('interval');
    const interval = rawInterval === undefined ? 1 : Number(rawInterval);
    if (!ALLOWED_INTERVALS_MINUTES.includes(interval as (typeof ALLOWED_INTERVALS_MINUTES)[number])) {
      return c.json(
        { message: `interval must be one of: ${ALLOWED_INTERVALS_MINUTES.join(', ')} (minutes)` },
        HttpStatusCode.BadRequest
      );
    }

    console.log(`📊 GET /api/v1/candles/${symbol}?limit=${limit}&interval=${interval}`);

    // Fetch the underlying 1-minute data from Redis. Storage is always
    // 1-minute; higher timeframes are rolled up here on read.
    const data = await getSymbolData(symbol);
    const ascending: Candle[] = [...data.history].reverse(); // stored newest-first
    if (data.current) ascending.push(data.current);

    const aggregated = aggregateCandles(ascending, interval);
    const history = aggregated.slice(-limit);

    const response = {
      symbol,
      interval,
      current: data.current,
      history,
      count: history.length,
    };

    console.log(`✅ Returning ${response.history.length} candles for ${symbol}`);

    return c.json(response);

  } catch (error) {
    console.error('❌ Error fetching candles:', error);
    return c.json(
      { 
        error: 'Failed to fetch candles', 
        details: error instanceof Error ? error.message : String(error) 
      }, 
      500
    );
  }
});

// GET /api/v1/candles (list info)
candlesRouter.get('/', async (c) => {
  return c.json({
    message: 'Use GET /api/v1/candles/:symbol to fetch candle data for a specific symbol',
    example: '/api/v1/candles/AAPL?limit=100',
  });
});

export default candlesRouter;