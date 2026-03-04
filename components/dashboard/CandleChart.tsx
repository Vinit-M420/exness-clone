/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType } from 'lightweight-charts'

interface CandlestickChartProps {
  selectedSymbol: string | null
}

type ChartDataType = {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export default function CandleChart({ selectedSymbol }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candlestickSeriesRef = useRef<any>(null)
  const [chartData, setChartData] = useState<ChartDataType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch candle data
  // useEffect(() => {
  //   const fetchCandles = async () => {
  //     try {
  //       setLoading(true)
  //       setError(null)
        
  //       const symbol = selectedSymbol?.replace('BINANCE:', '') || 'BTCUSDT'
  //       const from = Math.floor(Date.now() / 1000) - 86400 * 30 // 30 days ago
  //       const to = Math.floor(Date.now() / 1000)
        
  //       const res = await fetch(
  //         `https://finnhub.io/api/v1/crypto/candle?symbol=BINANCE:${symbol}&resolution=D&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`
  //       )

  //       if (!res.ok) {
  //         throw new Error('Failed to fetch candle data')
  //       }

  //       const data = await res.json()

  //       if (data.s === 'no_data' || !data.t || data.t.length === 0) {
  //         setError('No data available for this symbol')
  //         setChartData([])
  //         return
  //       }

  //       const formatted: ChartDataType[] = data.t.map((time: number, i: number) => ({
  //         time: time,
  //         open: data.o[i],
  //         high: data.h[i],
  //         low: data.l[i],
  //         close: data.c[i],
  //       }))

  //       setChartData(formatted)
  //     } catch (err) {
  //       console.error('Error fetching candles:', err)
  //       setError('Failed to load chart data')
  //       setChartData([])
  //     } finally {
  //       setLoading(false)
  //     }
  //   }

  //   if (selectedSymbol) {
  //     fetchCandles()
  //   }
  // }, [selectedSymbol])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart
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
      height: 500,
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

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      candlestickSeriesRef.current = null
    }
  }, [])

  // Update chart data when chartData changes
  useEffect(() => {
    if (candlestickSeriesRef.current && chartData.length > 0) {
      candlestickSeriesRef.current.setData(chartData)
      
      // Fit content to show all candles
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent()
      }
    }
  }, [chartData])

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">
        {selectedSymbol || 'Select a symbol'}
      </h3>
      
      {loading && (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400 animate-pulse">Loading chart...</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-center h-full">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div ref={chartContainerRef} className="w-full flex-1" />
      )}
    </div>
  )
}