'use client'

import { useState } from 'react'
import { X, Info, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function OrderPlacingPanel() {
  const [orderType, setOrderType] = useState<'Market' | 'Pending'>('Market')
  const [volume, setVolume] = useState('0.01')
  const [takeProfit, setTakeProfit] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [sellPercentage, setSellPercentage] = useState(55)

  const sellPrice = '4,242.41'
  const buyPrice = '4,242.57'
  const spread = '0.16 USD'

  return (
    <div className="w-[400px] h-screen bg-[#1a1d2e] border-l border-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="text-xs">⚡</span>
          </div>
          <span className="text-sm font-medium text-gray-200">XAU/USD</span>
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
        {/* Order Type Dropdown */}
        <div>
          <Select defaultValue="regular">
            <SelectTrigger className="w-full bg-[#0f1118] border-gray-700 text-gray-300 h-11">
              <SelectValue placeholder="Select order type" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d2e] border-gray-700">
              <SelectItem value="regular" className="text-gray-300">Regular form</SelectItem>
              <SelectItem value="advanced" className="text-gray-300">Advanced form</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sell / Buy Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Sell Card */}
          <div className="bg-linear-to-br from-red-950/30 to-transparent border border-red-900/30 rounded-lg p-3">
            <div className="text-xs text-red-400 mb-1">Sell</div>
            <div className="text-2xl font-bold text-red-400">{sellPrice}</div>
          </div>

          {/* Buy Card */}
          <div className="bg-linear-to-br from-blue-950/30 to-transparent border border-blue-900/30 rounded-lg p-3">
            <div className="text-xs text-blue-400 mb-1">Buy</div>
            <div className="text-2xl font-bold text-blue-400">{buyPrice}</div>
          </div>
        </div>

        {/* Spread Indicator */}
        <div className="relative">
          <div className="flex h-2 rounded-full overflow-hidden">
            <div 
              className="bg-linear-to-r from-red-500 to-red-600"
              style={{ width: `${sellPercentage}%` }}
            />
            <div 
              className="bg-linear-to-r from-blue-600 to-blue-500"
              style={{ width: `${100 - sellPercentage}%` }}
            />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1a1d2e] px-2 py-0.5 rounded text-xs text-gray-400 border border-gray-700">
            {spread}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-red-400">{sellPercentage}%</span>
            <span className="text-xs text-blue-400">{100 - sellPercentage}%</span>
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
          <label className="text-sm text-gray-400">Volume</label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="flex-1 bg-[#0f1118] border-gray-700 text-gray-300 h-11"
            />
            <Button
              variant="outline"
              size="sm"
              className="bg-[#0f1118] border-gray-700 text-gray-400 hover:text-gray-300 hover:bg-gray-800 h-11 px-4"
            >
              Lots
            </Button>
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

        {/* Take Profit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">Take Profit</label>
            <Info className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="Not set"
              className="flex-1 bg-[#0f1118] border-gray-700 text-gray-300 placeholder:text-gray-500 h-11"
            />
            <Select defaultValue="price">
              <SelectTrigger className="w-24 bg-[#0f1118] border-gray-700 text-gray-400 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d2e] border-gray-700">
                <SelectItem value="price" className="text-gray-300">Price</SelectItem>
                <SelectItem value="pips" className="text-gray-300">Pips</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-gray-400 hover:text-gray-300 hover:bg-gray-800"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-gray-400 hover:text-gray-300 hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stop Loss */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">Stop Loss</label>
            <Info className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Not set"
              className="flex-1 bg-[#0f1118] border-gray-700 text-gray-300 placeholder:text-gray-500 h-11"
            />
            <Select defaultValue="price">
              <SelectTrigger className="w-24 bg-[#0f1118] border-gray-700 text-gray-400 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d2e] border-gray-700">
                <SelectItem value="price" className="text-gray-300">Price</SelectItem>
                <SelectItem value="pips" className="text-gray-300">Pips</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-gray-400 hover:text-gray-300 hover:bg-gray-800"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-gray-400 hover:text-gray-300 hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer - Action Buttons */}
      <div className="border-t border-gray-800 p-4 grid grid-cols-2 gap-3">
        <Button className="h-12 bg-linear-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold">
          Sell
        </Button>
        <Button className="h-12 bg-linear-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold">
          Buy
        </Button>
      </div>
    </div>
  )
}