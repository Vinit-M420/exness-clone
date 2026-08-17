import { Hono } from 'hono';
import { getSymbolData } from '../candles/candleStore';
import { SymbolEnum } from '../schemas/market_order';
import { HttpStatusCode } from '../schemas/http_response';

const candlesRouter = new Hono();

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// GET /api/v1/candles/:symbol
// Example: GET /api/v1/candles/AAPL?limit=100
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

    console.log(`📊 GET /api/v1/candles/${symbol}?limit=${limit}`);

    // Fetch from Redis
    const data = await getSymbolData(symbol);
    const history = data.history.slice(0, limit);

    const response = {
      symbol,
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