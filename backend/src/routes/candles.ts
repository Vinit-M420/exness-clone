import { Hono } from 'hono';
import { getSymbolData } from '../candles/candleStore';

const candlesRouter = new Hono();

// GET /api/v1/candles/:symbol
// Example: GET /api/v1/candles/AAPL?limit=100
candlesRouter.get('/:symbol', async (c) => {
  try {
    const symbol = c.req.param('symbol');
    const limit = parseInt(c.req.query('limit') || '100');

    console.log(`📊 GET /api/v1/candles/${symbol}?limit=${limit}`);

    // Fetch from Redis
    const data = await getSymbolData(symbol);

    const response = {
      symbol,
      current: data.current,
      history: data.history.slice(0, limit),
      count: data.history.length,
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