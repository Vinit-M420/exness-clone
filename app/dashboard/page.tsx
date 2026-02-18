'use client'
import { useEffect, useState } from 'react';
import Navbar from '@/components/navbar'
import InstrumentsPanel from '@/components/dashboard/InstrumentsPanel'
import OrderTabs from '@/components/dashboard/OrdersTab'
import OrderPlacingPanel from '@/components/dashboard/OrderPlacingPanel'
// import BackgroundEffects from '@/components/BackgroundEffects'
import { Ticker } from '@/types/tickerType';
import { Order } from "@/types/orderInterface"

export default function DashboardPage() {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [tableRerender, setTableRerender] = useState(false);
  const [jwtToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") { 
      return localStorage.getItem("token"); }
    return null;
  });

  useEffect(() => {
    if (!jwtToken) return

    const fetchOrders = async () => {
      try {
        setLoading(true)

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/order/all`,
          {
            headers: {
              Authorization: `Bearer ${jwtToken}`,
              "Content-Type": "application/json",
            },
          }
        )
        
        if (!res.ok) {
          // console.error("Failed to fetch orders")
          setOrders([])
          return
        }

        const data = await res.json()
        console.log("res: ", data)
        
        // Handle both cases: empty array or orders array
        if (Array.isArray(data.orders)) {
          setOrders(data.orders)
        } else if (Array.isArray(data)) {
          setOrders(data)
        } else {
          setOrders([])
        }
        if (setTableRerender) setTableRerender(false);
      } catch (err) {
        console.error(err)
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()  
  }, [jwtToken, tableRerender])


  return (
    <>
      {/* <BackgroundEffects /> */}
      <Navbar />  
      <div className="relative z-10 flex mt-12 h-[calc(100vh-64px)]">
        {/* Left Sidebar - Instruments Panel */}
        <InstrumentsPanel 
          tickers={tickers} 
          setTickers={setTickers} 
          setSelectedSymbol={setSelectedSymbol} 
        />
        
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
            <OrderTabs orders={orders} setOrders={setOrders} loading={loading} />
          </div>
        </div>

        {/* Right Sidebar - Order Placing Panel */}
        <OrderPlacingPanel 
          tickers={tickers} 
          setTickers={setTickers} 
          setOrders={setOrders} 
          selectedSymbol={selectedSymbol} 
          setTableRerender={setTableRerender}
        />
      </div>
    </>
  )
}