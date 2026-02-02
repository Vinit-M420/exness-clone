'use client'

import { useState } from "react"
import { Settings, MoreVertical, X, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"

type OrderTabs = "Open" | "Pending" | "Closed"

export default function OrderTabs() {
  const [orderTab, setOrderTab] = useState<OrderTabs>("Open")

  const tabs: OrderTabs[] = ["Open", "Pending", "Closed"]

  return (
    <div className="bg-[#1a1d2e] border border-gray-800 rounded-lg flex flex-col h-full">
      {/* Header with Tabs and Actions */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4">
        {/* Order Tabs */}
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setOrderTab(tab)}
              className={`
                px-4 py-3 text-sm font-medium transition-colors relative
                ${
                  orderTab === tab
                    ? "text-gray-200"
                    : "text-gray-500 hover:text-gray-300"
                }
              `}
            >
              {tab}
              {/* Active Tab Indicator */}
              {orderTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200" />
              )}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        {orderTab === "Open" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400">No open positions</p>
          </div>
        )}

        {orderTab === "Pending" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400">No pending orders</p>
          </div>
        )}

        {orderTab === "Closed" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400">No closed positions</p>
          </div>
        )}
      </div>
    </div>
  )
}