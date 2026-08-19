'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  LineStyle,
  UTCTimestamp,
} from 'lightweight-charts'
import { Camera, ChevronDown, LineChart, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { AllSymbols_Metadata } from '@/data/allsymbols'

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
  interval: number
  current: CandleMessage['candle'] | null
  history: CandleMessage['candle'][]
  count: number
}

const TIMEFRAMES = [
  { label: '1m', minutes: 1 },
  { label: '5m', minutes: 5 },
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '4h', minutes: 240 },
  { label: '1D', minutes: 1440 },
] as const

const SMA_PERIODS = [20, 50] as const
const SMA_COLORS: Record<number, string> = { 20: '#FFD54F', 50: '#7C9CF5' }

type ChartPrefs = {
  timeframeMinutes: number
  smaPeriods: number[]
  overlaySymbol: string | null
}

function prefsKey(symbol: string) {
  return `chartPrefs:${symbol}`
}

// Buckets a raw 1-minute candle's epoch-ms time into a coarser timeframe
// bucket (also epoch-ms), for client-side rolling up of live 1-minute WS
// ticks into whatever timeframe the user has selected.
function bucketTimeMs(oneMinuteTimeMs: number, intervalMinutes: number): number {
  const bucketMs = intervalMinutes * 60000
  return Math.floor(oneMinuteTimeMs / bucketMs) * bucketMs
}

function computeSMA(data: ChartDataType[], period: number): { time: UTCTimestamp; value: number }[] {
  if (data.length < period) return []
  const out: { time: UTCTimestamp; value: number }[] = []
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close
    if (i >= period) sum -= data[i - period].close
    if (i >= period - 1) out.push({ time: data[i].time, value: sum / period })
  }
  return out
}

export default function CandleChart({ selectedSymbol }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const smaSeriesRef = useRef<Record<number, ISeriesApi<'Line'> | null>>({})
  const overlaySeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const [chartData, setChartData] = useState<ChartDataType[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)

  const [timeframeMinutes, setTimeframeMinutes] = useState<number>(1)
  const [smaPeriods, setSmaPeriods] = useState<number[]>([])
  const [overlaySymbol, setOverlaySymbol] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareQuery, setCompareQuery] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  // Whether the next `chartData` change should be applied as a full
  // setData()+fitContent() (history load / symbol/timeframe switch) or as a
  // single incremental series.update() (a live tick) - avoids resetting the
  // user's zoom/pan on every trade.
  const renderModeRef = useRef<'full' | 'incremental'>('full')

  // Mirrors of state read inside the WS message handler, which is set up
  // once per symbol and would otherwise close over stale values.
  const timeframeRef = useRef(timeframeMinutes)
  useEffect(() => { timeframeRef.current = timeframeMinutes }, [timeframeMinutes])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Load any saved chart prefs (timeframe/indicators/compare symbol) for
  // this symbol. Best-effort - a plain state reset if nothing was saved.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    setSmaPeriods([])
    setOverlaySymbol(null)
    setTimeframeMinutes(1)

    if (!selectedSymbol) return
    try {
      const raw = localStorage.getItem(prefsKey(selectedSymbol))
      if (!raw) return
      const prefs: Partial<ChartPrefs> = JSON.parse(raw)
      if (TIMEFRAMES.some((tf) => tf.minutes === prefs.timeframeMinutes)) {
        setTimeframeMinutes(prefs.timeframeMinutes!)
      }
      if (Array.isArray(prefs.smaPeriods)) {
        setSmaPeriods(prefs.smaPeriods.filter((p) => SMA_PERIODS.includes(p as 20 | 50)))
      }
      if (typeof prefs.overlaySymbol === 'string') {
        setOverlaySymbol(prefs.overlaySymbol)
      }
    } catch {
      // Malformed/legacy prefs - ignore and fall back to defaults.
    }
  }, [selectedSymbol])

  const saveChartPrefs = () => {
    if (!selectedSymbol) return
    const prefs: ChartPrefs = { timeframeMinutes, smaPeriods, overlaySymbol }
    localStorage.setItem(prefsKey(selectedSymbol), JSON.stringify(prefs))
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1500)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: Fetch historical candles, then connect to WebSocket
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (!selectedSymbol) {
      return
    }

    let cancelled = false
    renderModeRef.current = 'full'
    setChartData([])
    setChartError(null)

    const loadHistory = async () => {
      try {
        setIsLoadingHistory(true)
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/candles/${selectedSymbol}?limit=100&interval=${timeframeMinutes}`
        )
        if (!res.ok) return

        const data: CandleHistoryResponse = await res.json()
        if (cancelled) return

        // lightweight-charts requires strictly ascending, unique timestamps.
        // Redis history can contain stale/duplicate buckets across dev-server
        // restarts, so dedupe by time (keep newest) and sort explicitly
        // instead of trusting list order.
        const byTime = new Map<number, ChartDataType>()
        for (const c of data.history) {
          const time = Math.floor(c.time / 1000) as UTCTimestamp
          byTime.set(time, { time, open: c.open, high: c.high, low: c.low, close: c.close })
        }

        const sorted = Array.from(byTime.values()).sort((a, b) => a.time - b.time)

        // The underlying 1-minute history is trimmed by push-count, not by
        // time, so a stale candle (flushed from `current` after the backend
        // sat idle) can linger at the start with a timestamp far older than
        // the rest. That stretches the time axis and squashes real candles
        // into a sliver, so keep only the trailing contiguous cluster: walk
        // back from the most recent candle and cut at the first gap bigger
        // than 10 bucket-widths.
        const maxGapSeconds = timeframeMinutes * 60 * 10
        let start = sorted.length - 1
        while (start > 0 && sorted[start].time - sorted[start - 1].time <= maxGapSeconds) {
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
  }, [selectedSymbol, timeframeMinutes])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: Connect to WebSocket for Real-time Candle Updates
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (!selectedSymbol) {
      return
    }

    let cancelled = false
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      if (cancelled) return

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

      ws.onmessage = onMessage

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setIsConnected(false)
      }

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected')
        setIsConnected(false)
        if (!cancelled) {
          reconnectTimeout = setTimeout(connect, 2000)
        }
      }
    }

    const onMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data)

        if (message.type !== 'candle') return
        const candleMsg = message as CandleMessage
        if (candleMsg.symbol !== selectedSymbol) return

        const bucketTime = Math.floor(
          bucketTimeMs(candleMsg.candle.time, timeframeRef.current) / 1000
        ) as UTCTimestamp

        setChartData((prev) => {
          if (prev.length === 0) {
            renderModeRef.current = 'full'
            return [{
              time: bucketTime,
              open: candleMsg.candle.open,
              high: candleMsg.candle.high,
              low: candleMsg.candle.low,
              close: candleMsg.candle.close,
            }]
          }

          const last = prev[prev.length - 1]
          if (bucketTime > last.time) {
            renderModeRef.current = 'incremental'
            return [...prev, {
              time: bucketTime,
              open: candleMsg.candle.open,
              high: candleMsg.candle.high,
              low: candleMsg.candle.low,
              close: candleMsg.candle.close,
            }]
          } else if (bucketTime === last.time) {
            // Roll this 1-minute tick into the current higher-timeframe
            // bucket instead of replacing it outright.
            renderModeRef.current = 'incremental'
            const updated = [...prev]
            updated[updated.length - 1] = {
              time: last.time,
              open: last.open,
              high: Math.max(last.high, candleMsg.candle.high),
              low: Math.min(last.low, candleMsg.candle.low),
              close: candleMsg.candle.close,
            }
            return updated
          } else {
            // Stale/out-of-order update for a time before the last known
            // bucket - lightweight-charts requires strictly ascending
            // timestamps, so drop it instead of corrupting the series.
            console.warn('⏮️ Ignoring out-of-order candle update:', candleMsg.candle)
            return prev
          }
        })
      } catch (err) {
        console.error('❌ Error parsing WebSocket message:', err)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimeout) clearTimeout(reconnectTimeout)

      const ws = wsRef.current
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'unsubscribe',
            symbol: selectedSymbol
          }))
          console.log(`📴 Unsubscribed from ${selectedSymbol}`)
        }
        ws.close()
      }
      setChartData([])
    }
  }, [selectedSymbol])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: Initialize Chart (One Time)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (!chartContainerRef.current) {
      return
    }

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
      height: chartContainerRef.current.clientHeight || 500,
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
      },
      leftPriceScale: {
        visible: false,
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
      // Dashed last-price line + price tag on the right edge.
      priceLineVisible: true,
      priceLineStyle: LineStyle.Dashed,
    })

    chartRef.current = chart
    candlestickSeriesRef.current = candlestickSeries

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = chartContainerRef.current.clientWidth
        const newHeight = chartContainerRef.current.clientHeight || 500

        chartRef.current.applyOptions({
          width: newWidth,
          height: newHeight,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      candlestickSeriesRef.current = null
      smaSeriesRef.current = {}
      overlaySeriesRef.current = null
    }
  }, [])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 4: Update Chart When Data Changes
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (!candlestickSeriesRef.current) {
      return
    }

    try {
      if (chartData.length === 0) {
        // Clear any previous symbol's/timeframe's candles instead of
        // leaving them on screen until the next data arrives.
        candlestickSeriesRef.current.setData([])
        return
      }

      if (renderModeRef.current === 'incremental') {
        candlestickSeriesRef.current.update(chartData[chartData.length - 1])
      } else {
        candlestickSeriesRef.current.setData(chartData)
        chartRef.current?.timeScale().fitContent()
      }
      setChartError(null)
    } catch (error) {
      console.error('❌ Error rendering chart data:', error)
      setChartError(error instanceof Error ? error.message : String(error))
    }
  }, [chartData])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Indicators: simple moving-average overlays (create/remove series as
  // toggled, recompute from the full candle series whenever it changes)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    for (const period of SMA_PERIODS) {
      const enabled = smaPeriods.includes(period)
      const existing = smaSeriesRef.current[period]

      if (enabled && !existing) {
        smaSeriesRef.current[period] = chart.addLineSeries({
          color: SMA_COLORS[period],
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        })
      } else if (!enabled && existing) {
        chart.removeSeries(existing)
        smaSeriesRef.current[period] = null
      }
    }
  }, [smaPeriods])

  useEffect(() => {
    for (const period of SMA_PERIODS) {
      const series = smaSeriesRef.current[period]
      if (series) series.setData(computeSMA(chartData, period))
    }
  }, [chartData, smaPeriods])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Overlay symbol comparison: fetch the compared symbol's history at the
  // same timeframe, normalize to % change from its first candle, and plot
  // as a line on the left price scale. Refreshed on selection and on
  // timeframe change; not live-ticked per-trade to keep this contained.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    chart.applyOptions({ leftPriceScale: { visible: !!overlaySymbol } })

    if (!overlaySymbol) {
      if (overlaySeriesRef.current) {
        chart.removeSeries(overlaySeriesRef.current)
        overlaySeriesRef.current = null
      }
      return
    }

    if (!overlaySeriesRef.current) {
      overlaySeriesRef.current = chart.addLineSeries({
        color: '#7C9CF5',
        lineWidth: 2,
        priceScaleId: 'left',
        priceLineVisible: false,
        lastValueVisible: true,
        title: `${overlaySymbol.replace('BINANCE:', '')} %`,
      })
    }

    let cancelled = false
    const loadOverlay = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/candles/${overlaySymbol}?limit=100&interval=${timeframeMinutes}`
        )
        if (!res.ok || cancelled) return
        const data: CandleHistoryResponse = await res.json()
        if (cancelled || data.history.length === 0) return

        const sorted = [...data.history].sort((a, b) => a.time - b.time)
        const baseClose = sorted[0].close
        const points = sorted.map((c) => ({
          time: Math.floor(c.time / 1000) as UTCTimestamp,
          value: baseClose === 0 ? 0 : ((c.close - baseClose) / baseClose) * 100,
        }))

        overlaySeriesRef.current?.setData(points)
      } catch (err) {
        console.error('❌ Error fetching overlay symbol history:', err)
      }
    }

    loadOverlay()

    return () => {
      cancelled = true
    }
  }, [overlaySymbol, timeframeMinutes])

  const takeScreenshot = () => {
    const chart = chartRef.current
    if (!chart || !selectedSymbol) return

    const canvas = chart.takeScreenshot()
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedSymbol.replace('BINANCE:', '')}_${timeframeMinutes}m.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const compareResults = AllSymbols_Metadata.filter(
    (s) =>
      s.symbol !== selectedSymbol &&
      (compareQuery === '' ||
        s.symbol.toLowerCase().includes(compareQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(compareQuery.toLowerCase()))
  ).slice(0, 20)

  const lastCandle = chartData[chartData.length - 1] ?? null
  const changePct =
    lastCandle && lastCandle.open !== 0
      ? ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100
      : null

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with status */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-200">
          {selectedSymbol?.replace('BINANCE:', '') || 'Select a symbol'}
        </h3>

        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>

          {chartData.length > 0 && (
            <span className="text-xs text-gray-500">
              {chartData.length} candles
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Select
          value={String(timeframeMinutes)}
          onValueChange={(v) => setTimeframeMinutes(Number(v))}
        >
          <SelectTrigger size="sm" className="h-8 w-20 bg-[#0f1118] border-gray-700 text-gray-300 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#141829] border-gray-700 text-gray-100">
            {TIMEFRAMES.map((tf) => (
              <SelectItem key={tf.minutes} value={String(tf.minutes)} className="text-xs">
                {tf.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 gap-1 text-xs ${smaPeriods.length > 0 ? 'text-amber-300' : 'text-gray-400'} hover:text-amber-300 hover:bg-gray-800`}
            >
              <LineChart className="h-3.5 w-3.5" />
              Indicators
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-40 p-2 bg-[#141829] border-gray-700">
            {SMA_PERIODS.map((period) => {
              const enabled = smaPeriods.includes(period)
              return (
                <button
                  key={period}
                  onClick={() =>
                    setSmaPeriods((prev) =>
                      enabled ? prev.filter((p) => p !== period) : [...prev, period]
                    )
                  }
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-xs ${
                    enabled ? 'bg-gray-800 text-amber-300' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SMA_COLORS[period] }} />
                    SMA {period}
                  </span>
                  {enabled && <span>✓</span>}
                </button>
              )
            })}
          </PopoverContent>
        </Popover>

        <Popover open={compareOpen} onOpenChange={setCompareOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 gap-1 text-xs ${overlaySymbol ? 'text-amber-300' : 'text-gray-400'} hover:text-amber-300 hover:bg-gray-800`}
            >
              Compare
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0 bg-[#0f1118] border-gray-700">
            <div className="p-2">
              {overlaySymbol ? (
                <div className="mb-2 flex items-center justify-between rounded bg-gray-800 px-2 py-1.5 text-xs text-gray-200">
                  <span>Comparing: {overlaySymbol.replace('BINANCE:', '')}</span>
                  <button onClick={() => setOverlaySymbol(null)} className="text-gray-400 hover:text-red-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="mb-2 text-xs text-gray-500">Add overlay symbol for comparison</p>
              )}
              <Input
                value={compareQuery}
                onChange={(e) => setCompareQuery(e.target.value)}
                placeholder="Search symbol..."
                className="h-8 bg-[#141829] border-gray-700 text-gray-300 text-xs"
              />
            </div>
            <Command className="bg-[#0f1118]">
              <CommandList className="max-h-48">
                {compareResults.length === 0 ? (
                  <CommandEmpty className="py-4 text-center text-xs text-gray-500">
                    No symbols found.
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {compareResults.map((s) => (
                      <CommandItem
                        key={s.symbol}
                        value={s.symbol}
                        onSelect={() => setOverlaySymbol(s.symbol)}
                        className="text-xs text-gray-300 aria-selected:bg-gray-800 cursor-pointer"
                      >
                        {s.symbol} <span className="ml-2 text-gray-500">{s.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
            <div className="flex justify-end p-2 border-t border-gray-800">
              <Button size="sm" className="h-7 text-xs" onClick={() => setCompareOpen(false)}>
                Ok
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="sm"
          onClick={saveChartPrefs}
          disabled={!selectedSymbol}
          className={`h-8 gap-1 text-xs ${justSaved ? 'text-green-400' : 'text-gray-400'} hover:text-amber-300 hover:bg-gray-800`}
        >
          <Save className="h-3.5 w-3.5" />
          {justSaved ? 'Saved' : 'Save'}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={takeScreenshot}
          disabled={!selectedSymbol || chartData.length === 0}
          className="h-8 w-8 text-gray-400 hover:text-amber-300 hover:bg-gray-800"
          title="Save chart screenshot"
        >
          <Camera className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Chart area - container always mounted so the chart initializes once and stays alive */}
      <div className="relative w-full flex-1 min-h-65">
        <div
          ref={chartContainerRef}
          className="w-full h-full"
        />

        {/* OHLC readout */}
        {lastCandle && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-2 rounded bg-[#1a1d2e]/80 px-2 py-1 text-xs text-gray-300 pointer-events-none">
            <span>O <span className="text-gray-100">{lastCandle.open.toFixed(2)}</span></span>
            <span>H <span className="text-gray-100">{lastCandle.high.toFixed(2)}</span></span>
            <span>L <span className="text-gray-100">{lastCandle.low.toFixed(2)}</span></span>
            <span>C <span className="text-gray-100">{lastCandle.close.toFixed(2)}</span></span>
            {changePct !== null && (
              <span className={changePct >= 0 ? 'text-green-400' : 'text-red-400'}>
                {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
              </span>
            )}
          </div>
        )}

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
