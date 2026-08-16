'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'

interface CandlestickChartProps {
  selectedSymbol: string | null
}

type ChartDataType = {
  time: UTCTimestamp
  open: number
  high: number
  low: number
  close: number
}

type CandleMessage = {
  type: 'candle'
  symbol: string
  event: 'new' | 'update'
  candle: {
    time: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  }
}

type CandleHistoryResponse = {
  symbol: string
  current: CandleMessage['candle'] | null
  history: CandleMessage['candle'][]
  count: number
}

export default function CandleChart({ selectedSymbol }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const [chartData, setChartData] = useState<ChartDataType[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: Fetch historical candles, then connect to WebSocket
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (!selectedSymbol) {
      return
    }

    let cancelled = false
    setChartData([])
    setChartError(null)

    const loadHistory = async () => {
      try {
        setIsLoadingHistory(true)
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/candles/${selectedSymbol}?limit=100`
        )
        if (!res.ok) return

        const data: CandleHistoryResponse = await res.json()
        if (cancelled) return

        // lightweight-charts requires strictly ascending, unique timestamps.
        // Redis history can contain stale/duplicate minute buckets across
        // dev-server restarts, so dedupe by time (keep newest) and sort
        // explicitly instead of trusting list order.
        const byTime = new Map<number, ChartDataType>()
        for (const c of data.history) {
          const time = Math.floor(c.time / 1000) as UTCTimestamp
          byTime.set(time, { time, open: c.open, high: c.high, low: c.low, close: c.close })
        }
        if (data.current) {
          const time = Math.floor(data.current.time / 1000) as UTCTimestamp
          byTime.set(time, {
            time,
            open: data.current.open,
            high: data.current.high,
            low: data.current.low,
            close: data.current.close,
          })
        }

        const sorted = Array.from(byTime.values()).sort((a, b) => a.time - b.time)

        // Redis's history list is trimmed by push-count, not by time, so a
        // stale candle (flushed from `current` after the backend sat idle)
        // can linger at the start with a timestamp far older than the rest.
        // That stretches the time axis and squashes real candles into a
        // sliver, so keep only the trailing contiguous cluster: walk back
        // from the most recent candle and cut at the first gap bigger than
        // 10 minutes (candles are 1-minute buckets, so any larger gap means
        // a stale/disconnected chunk before it).
        const MAX_GAP_SECONDS = 10 * 60
        let start = sorted.length - 1
        while (start > 0 && sorted[start].time - sorted[start - 1].time <= MAX_GAP_SECONDS) {
          start--
        }
        const seeded = sorted.slice(start)

        setChartData(seeded)
      } catch (err) {
        console.error('❌ Error fetching candle history:', err)
      } finally {
        if (!cancelled) setIsLoadingHistory(false)
      }
    }

    loadHistory()

    return () => {
      cancelled = true
    }
  }, [selectedSymbol])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: Connect to WebSocket for Real-time Candle Updates
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (!selectedSymbol) {
      return
    }

    console.log(`🔌 Connecting to WebSocket for ${selectedSymbol}`)
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_API_BASE}`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('✅ WebSocket connected')
      setIsConnected(true)
      
      ws.send(JSON.stringify({
        type: 'subscribe',
        symbol: selectedSymbol
      }))
      console.log(`📡 Subscribed to ${selectedSymbol}`)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        
        if (message.type === 'candle' && message.symbol === selectedSymbol) {
          const candleMsg = message as CandleMessage
          
          console.log(`🕯️ Candle ${candleMsg.event}:`, candleMsg.candle)

          const newCandle: ChartDataType = {
            time: Math.floor(candleMsg.candle.time / 1000) as UTCTimestamp,
            open: candleMsg.candle.open,
            high: candleMsg.candle.high,
            low: candleMsg.candle.low,
            close: candleMsg.candle.close,
          }

          setChartData((prev) => {
            if (prev.length === 0) {
              console.log('🆕 First candle - adding to chart')
              return [newCandle]
            }

            const lastTime = prev[prev.length - 1].time
            if (newCandle.time > lastTime) {
              console.log('➕ Adding NEW candle to chart')
              const updated = [...prev, newCandle]
              console.log(`📊 Chart now has ${updated.length} candles`)
              return updated
            } else if (newCandle.time === lastTime) {
              console.log('🔄 Updating LAST candle')
              const updated = [...prev]
              updated[updated.length - 1] = newCandle
              return updated
            } else {
              // Stale/out-of-order update for a time before the last known
              // candle - lightweight-charts requires strictly ascending
              // timestamps, so drop it instead of corrupting the series.
              console.warn('⏮️ Ignoring out-of-order candle update:', newCandle)
              return prev
            }
          })
        }
      } catch (err) {
        console.error('❌ Error parsing WebSocket message:', err)
      }
    }

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
      setIsConnected(false)
    }

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected')
      setIsConnected(false)
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'unsubscribe',
          symbol: selectedSymbol
        }))
        console.log(`📴 Unsubscribed from ${selectedSymbol}`)
      }
      ws.close()
      setChartData([])
    }
  }, [selectedSymbol])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: Initialize Chart (One Time)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (!chartContainerRef.current) {
      console.log('❌ Chart container ref not available')
      return
    }

    console.log('📊 Initializing chart...')
    console.log('Container dimensions:', {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight
    })

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1d2e' },
        textColor: '#9BA3B4',
      },
      grid: {
        vertLines: { color: '#2B2B43', style: 1 },
        horzLines: { color: '#2B2B43', style: 1 },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 500, // ✅ Use container height or default
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
      },
      timeScale: {
        borderColor: '#2B2B43',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })

    chartRef.current = chart
    candlestickSeriesRef.current = candlestickSeries
    console.log('✅ Chart initialized successfully')

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = chartContainerRef.current.clientWidth
        const newHeight = chartContainerRef.current.clientHeight || 500
        
        chartRef.current.applyOptions({
          width: newWidth,
          height: newHeight,
        })
        console.log('📐 Chart resized:', { width: newWidth, height: newHeight })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      candlestickSeriesRef.current = null
      console.log('🧹 Chart cleaned up')
    }
  }, [])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 4: Update Chart When Data Changes
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (!candlestickSeriesRef.current) {
      console.log('⚠️ Series ref not available yet')
      return
    }

    if (chartData.length > 0) {
      console.log(`📈 Rendering ${chartData.length} candles on chart`)
      console.log('📊 Chart data:', chartData)
      
      try {
        candlestickSeriesRef.current.setData(chartData)
        console.log('✅ Data set successfully')
        setChartError(null)

        if (chartRef.current) {
          chartRef.current.timeScale().fitContent()
          console.log('✅ Chart fitted to content')
        }
      } catch (error) {
        console.error('❌ Error setting chart data:', error)
        setChartError(error instanceof Error ? error.message : String(error))
      }
    } else {
      console.log('⚠️ No candle data to render yet - waiting for trades...')
    }
  }, [chartData])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with status */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200">
          {selectedSymbol?.replace('BINANCE:', '') || 'Select a symbol'}
        </h3>
        
        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          {/* WebSocket Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
          
          {/* Candle Count */}
          {chartData.length > 0 && (
            <span className="text-xs text-gray-500">
              {chartData.length} candles
            </span>
          )}
        </div>
      </div>
      
      {/* Chart area - container always mounted so the chart initializes once and stays alive */}
      <div className="relative w-full flex-1 min-h-65">
        <div
          ref={chartContainerRef}
          className="w-full h-full"
        />

        {/* No Symbol Selected */}
        {!selectedSymbol && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1d2e]">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-gray-400 text-sm">Select a symbol to view live chart</p>
            </div>
          </div>
        )}

        {/* Chart render error */}
        {chartError && (
          <div className="absolute top-2 left-2 right-2 z-10 rounded bg-red-950/90 border border-red-800 px-3 py-2 text-xs text-red-300">
            Failed to render candles: {chartError}
          </div>
        )}

        {/* Waiting for Candles */}
        {selectedSymbol && chartData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1d2e]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-gray-600 border-t-green-500 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">
                {isLoadingHistory ? 'Loading candle history...' : 'Waiting for candle data...'}
              </p>
              <p className="text-gray-500 text-xs">
                {isConnected ? 'Connected - waiting for trades' : 'Connecting...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}