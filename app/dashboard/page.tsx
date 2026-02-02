'use client'

import Navbar from '@/components/navbar'
import Search from '@/components/dashboard/InstrumentsPanel'
// import GridBackground from '@/components/GridBackground'
// import BackgroundEffects from '@/components/BackgroundEffects'

export default function DashboardPage() {
  return (
    <>
      {/* <GridBackground /> */}
      {/* <BackgroundEffects> */}
      <Navbar />  
      <div className="relative z-10 flex flex-col h-screen mt-12">
         
        {/* Main Dashboard Grid */}
        <div className="flex-1 grid grid-cols-[320px,1fr] overflow-hidden">
          {/* Left Sidebar - Instruments Panel */}
          <Search />
          
          {/* Right Side - 2 Sections */}
          <div className="grid grid-rows-[1fr,300px] gap-4 p-4 overflow-hidden">
            {/* Top Right - Chart Area */} 
            {/* bg-[#1a1d2e] */}
            <div className="bg-transparent border border-gray-800 rounded-lg p-6 overflow-auto">
              <h2 className="text-xl font-semibold text-gray-200 mb-4">Chart Area</h2>
              <p className="text-gray-400">TradingView chart will go here</p>
            </div>
            
            {/* Bottom Right - Order Panel */}
            <div className="bg-transparent border border-gray-800 rounded-lg p-6 overflow-auto">
              <h2 className="text-xl font-semibold text-gray-200 mb-4">Order Panel</h2>
              <p className="text-gray-400">Buy/Sell orders will go here</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}