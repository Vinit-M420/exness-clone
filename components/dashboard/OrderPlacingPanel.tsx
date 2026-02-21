'use client'
import { useState } from 'react'
import { X, Plus, Minus, ArrowBigUp, ArrowBigDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group'
// import { TPSLInput } from '../TPSLinput'
import { Ticker } from '@/types/tickerType'
import { Order } from '@/types/orderInterface'
import { TPSLInput } from '../TPSLinput'
import { orders } from '@/backend/src/db/schema'

type OrderPanelProps = {
  tickers: Record<string, Ticker>,
  setTickers: React.Dispatch<React.SetStateAction<Record<string, Ticker>>>,
  selectedSymbol: string | null,
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>,
  setTableRerender: React.Dispatch<React.SetStateAction<boolean>>,
}

export default function OrderPlacingPanel({tickers, selectedSymbol, setTableRerender} : OrderPanelProps) {
  const [orderType, setOrderType] = useState<'Market' | 'Pending'>('Market')
  const [volume, setVolume] = useState('0.01')
  const [takeProfit, setTakeProfit] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [triggerPrice, setTriggerPrice] = useState('')
  const ticker = tickers[selectedSymbol || 'BINANCE:SOLUSDT']

  const buyPrice = ticker?.ask ?? 0
  const sellPrice = ticker?.bid ?? 0
  const spread = buyPrice - sellPrice

  const [jwtToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token")
    }
    return null
  })

  const [buyPercentage] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.floor(Math.random() * 20) + 40; // 40–60%
    }
    return 50; // SSR fallback
  });

  const sellPercentage = 100 - buyPercentage;
  
  // useEffect(() => {

  // }, [orders])
  
  async function placeMarketOrder(side: 'BUY' | 'SELL') {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/v1/order/market`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${jwtToken}`, 
          'Content-Type': "application/json"
        },
        body: JSON.stringify({
          symbol: selectedSymbol,
          side: side.toLowerCase(),
          lotSize: parseFloat(volume),
          ...(stopLoss && { stopLoss: parseFloat(stopLoss) }),
          ...(takeProfit && { takeProfit: parseFloat(takeProfit) })
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error placing order:", errorData);
        return;
      }

      const data = await res.json();
      console.log("Order placed successfully:", data);
      // if (data.order) {
      //   setOrders(prevOrders => [...prevOrders, data.order]);
      // }
      setTableRerender(true);
      console.log("Orders: ", orders);
      
    } catch (e) {
      console.error("Error:", e);
    }
  }

  async function placeLimitOrder(side: 'BUY' | 'SELL') {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/v1/order/limit`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${jwtToken}`, 
          'Content-Type': "application/json"
        },
        body: JSON.stringify({
          symbol: selectedSymbol,
          side: side.toLowerCase(),
          lotSize: parseFloat(volume),
          ...(stopLoss && { stopLoss: parseFloat(stopLoss) }),
          ...(takeProfit && { takeProfit: parseFloat(takeProfit) }),
          ...(triggerPrice && { triggerPrice: parseFloat(triggerPrice) }),          
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error placing limit order:", errorData);
        return;
      }

      const data = await res.json();
      console.log("Limit Order placed successfully:", data);
      // if (data.order) {
      //   setOrders(prevOrders => [...prevOrders, data.order]);
      // }
      console.log("Orders: ", orders);
      setTableRerender(true);
    } catch (e) {
      console.error("Error:", e);
    }
  }

  return (
    <div className="w-80 h-[calc(100vh-48px)] bg-[#1a1d2e] border-l border-gray-800 flex flex-col z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">{selectedSymbol}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-400 hover:text-gray-200 hover:bg-gray-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Sell / Buy Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Sell Card */}
          <div className="bg-linear-to-br from-red-950/30 to-transparent border border-red-900/30 rounded-lg p-3">
            <div className="text-xs text-red-400 mb-1">Sell</div>
            <div className="text-2xl font-bold text-red-400">{sellPrice.toFixed(2)}</div>
          </div>

          {/* Buy Card */}
          <div className="bg-linear-to-br from-blue-950/30 to-transparent border border-blue-900/30 rounded-lg p-3">
            <div className="text-xs text-blue-400 mb-1">Buy</div>
            <div className="text-2xl font-bold text-blue-400">{buyPrice.toFixed(2)}</div>
          </div>
        </div>

        {/* Spread Indicator */}
        <div className="relative">
          <div className="flex h-2 rounded-full overflow-hidden">
            <div 
              className="bg-linear-to-r from-red-500 to-red-600"
              style={{ width: `${sellPercentage}%` }}
              suppressHydrationWarning
            />
            <div 
              className="bg-linear-to-r from-blue-600 to-blue-500"
              style={{ width: `${100 - sellPercentage}%` }}
              suppressHydrationWarning
            />
          </div>
          <div className="absolute mt-0.5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1a1d2e] px-2 py-0.5 rounded text-xs text-gray-400 border border-gray-700">
            {spread.toFixed(2)}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-red-400" suppressHydrationWarning>{sellPercentage}%</span>
            <span className="text-xs text-blue-400" suppressHydrationWarning>{100 - sellPercentage}%</span>
          </div>
        </div>

        {/* Market / Pending Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setOrderType('Market')}
            className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
              orderType === 'Market'
                ? 'bg-gray-700 text-gray-200'
                : 'bg-[#0f1118] text-gray-400 hover:text-gray-300'
            }`}
          >
            Market
          </button>
          <button
            onClick={() => setOrderType('Pending')}
            className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
              orderType === 'Pending'
                ? 'bg-gray-700 text-gray-200'
                : 'bg-[#0f1118] text-gray-400 hover:text-gray-300'
            }`}
          >
            Pending
          </button>
        </div>

        {/* Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">Volume</label>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex rounded-lg border border-gray-700 bg-transparent overflow-hidden">
              <InputGroup>
                <InputGroupInput
                  type="text"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="border-0 text-gray-300 h-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <InputGroupAddon align="inline-end" className='text-sm text-gray-400'>Lots</InputGroupAddon>
              </InputGroup>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-gray-400 hover:text-gray-300 hover:bg-gray-800"
              onClick={() => setVolume((parseFloat(volume) - 0.01).toFixed(2))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-gray-400 hover:text-gray-300 hover:bg-gray-800"
              onClick={() => setVolume((parseFloat(volume) + 0.01).toFixed(2))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TPSLInput label='Take Profit' value={takeProfit}  onChange={setTakeProfit} />
        <TPSLInput label='Stop Loss' value={stopLoss}  onChange={setStopLoss} />
        
        {orderType === 'Pending' && (
          <TPSLInput label='Trigger' value={triggerPrice}  onChange={setTriggerPrice} />
        )}

      </div>

      {/* Action Buttons - Buy and Sell */}
      <div className="border-t border-gray-800 p-4 grid grid-cols-2 gap-3">
        <Button 
          onClick={() => {
            if (orderType === 'Market') placeMarketOrder('SELL');
            else placeLimitOrder("SELL");
          }}
          className="h-12 bg-linear-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold"
        >
          Sell
          <ArrowBigDown className="h-4 w-4 fill-white" />
        </Button>
        <Button 
          onClick={() => {
            if (orderType === 'Market') placeMarketOrder('BUY');
            else placeLimitOrder("BUY");
          }}
          className="h-12 bg-linear-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
        >
          Buy
          <ArrowBigUp className="h-4 w-4 fill-white" />
        </Button>
      </div>
    </div>
  )
}