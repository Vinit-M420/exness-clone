'use client'

import Navbar from '@/components/navbar'
import InstrumentsPanel from '@/components/dashboard/InstrumentsPanel'
import OrderTabs from '@/components/dashboard/OrdersTab'
import OrderPlacingPanel from '@/components/dashboard/OrderPlacingPanel'
// import BackgroundEffects from '@/components/BackgroundEffects'

export default function DashboardPage() {
  return (
    <>
      {/* <BackgroundEffects /> */}
      <Navbar />  
      <div className="relative z-10 flex mt-12 h-[calc(100vh-64px)]">
        {/* Left Sidebar - Instruments Panel */}
        <InstrumentsPanel />
        
        {/* Middle - Chart Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top - Chart */}
          <div className="flex-1 border-l border-gray-800 p-4 overflow-auto">
            <div className="bg-transparent border border-gray-800 rounded-lg p-6 h-full">
              <h2 className="text-xl font-semibold text-gray-200 mb-4">Chart Area</h2>
              <p className="text-gray-400">TradingView chart will go here</p>
            </div>
          </div>
          
          {/* Bottom - Order Tabs */}
          <div className="h-[300px] border-l border-t border-gray-800 p-4">
            <OrderTabs />
          </div>
        </div>

        {/* Right Sidebar - Order Placing Panel */}
        <OrderPlacingPanel />
      </div>
    </>
  )
}