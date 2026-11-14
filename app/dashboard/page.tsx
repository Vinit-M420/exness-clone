'use client'
import { useCallback, useEffect, useRef, useState } from 'react';
import Navbar from '@/components/navbar'
import InstrumentsPanel from '@/components/dashboard/InstrumentsPanel'
import OrderTabs from '@/components/dashboard/OrdersTab'
import OrderPlacingPanel from '@/components/dashboard/OrderPlacingPanel'
// import BackgroundEffects from '@/components/BackgroundEffects'
// import { Ticker } from '@/types/tickerType';
import { Order } from "@/types/orderInterface"
import CandleChart from '@/components/dashboard/CandleChart';
import { diffOrders, showOrderEventToast } from '@/components/dashboard/funcs/orderStatusToasts';

// Limit fills and SL/TP closes happen server-side with no push to the client,
// so orders + balance are polled while the tab is visible to pick them up
const ORDER_POLL_MS = 3000;
const DEFAULT_SYMBOL = 'BINANCE:BTCUSDT';

export default function DashboardPage() {
  // const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [openSymbols, setOpenSymbols] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("openSymbols");
        if (raw) return JSON.parse(raw);
      } catch {
        // ignore malformed saved tabs
      }
    }
    return [];
  });
  // Start on the last open tab (or BTC, which the chart shows by default) so the
  // order panel always has a symbol and live prices instead of "-"
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(
    () => openSymbols[openSymbols.length - 1] ?? DEFAULT_SYMBOL
  );
  const [walletBalance, setWalletBalance] = useState<{ balance: string; currency: string } | null>(null);
  const [tableRerender, setTableRerender] = useState(false);
  const [jwtToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token"); }
    return null;
  });

  // Keep whatever symbol is currently selected as an open tab.
  useEffect(() => {
    if (selectedSymbol && !openSymbols.includes(selectedSymbol)) {
      setOpenSymbols((prev) => [...prev, selectedSymbol]);
    }
  }, [selectedSymbol, openSymbols]);

  useEffect(() => {
    localStorage.setItem("openSymbols", JSON.stringify(openSymbols));
  }, [openSymbols]);

  const fetchWallet = useCallback(async () => {
    if (!jwtToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/v1/wallet/get`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.response) setWalletBalance(data.response);
    } catch (err) {
      console.error("Failed to fetch wallet balance", err);
    }
  }, [jwtToken]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleCloseTab = (symbol: string) => {
    setOpenSymbols((prev) => {
      const next = prev.filter((s) => s !== symbol);
      if (selectedSymbol === symbol) {
        setSelectedSymbol(next[next.length - 1] ?? null);
      }
      return next;
    });
  };

  // Status of every order as of the last fetch - diffed against the next fetch
  // to toast limit fills / SL / TP. null until the first load, so existing
  // orders don't toast on page open.
  const lastStatuses = useRef<Map<string, Order["status"]> | null>(null);

  // silent = background poll: no loading spinner, keep current orders on error
  const fetchOrders = useCallback(async (silent = false) => {
    if (!jwtToken) return
    try {
      if (!silent) setLoading(true)

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
        if (!silent) setOrders([])
        return
      }

      const data = await res.json()

      // Handle both cases: empty array or orders array
      const next: Order[] = Array.isArray(data.orders) ? data.orders
        : Array.isArray(data) ? data
        : []

      if (lastStatuses.current) {
        diffOrders(lastStatuses.current, next).forEach(showOrderEventToast)
      }
      lastStatuses.current = new Map(next.map((o) => [o.id, o.status]))

      setOrders(next)
      setTableRerender(false);
    } catch (err) {
      console.error(err)
      if (!silent) setOrders([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [jwtToken])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders, tableRerender])

  useEffect(() => {
    if (!jwtToken) return
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return
      fetchOrders(true)
      fetchWallet()
    }, ORDER_POLL_MS)
    return () => clearInterval(id)
  }, [jwtToken, fetchOrders, fetchWallet])


  return (
    <>
      {/* <BackgroundEffects /> */}
      <Navbar
        openSymbols={openSymbols}
        activeSymbol={selectedSymbol}
        onSelectSymbol={setSelectedSymbol}
        onCloseSymbol={handleCloseTab}
        onAddSymbol={setSelectedSymbol}
        walletBalance={walletBalance}
      />
      {/* Exactly one viewport tall: the navbar is fixed (48px), so the shell
          pads 48px + the 8px gutter at the top and never scrolls. Every panel
          is separated by the same 8px gap. */}
      <main className="relative z-10 flex h-dvh gap-2 overflow-hidden px-2 pb-2 pt-14">
        {/* Left Sidebar - Instruments Panel */}
        <InstrumentsPanel
          selectedSymbol={selectedSymbol}
          setSelectedSymbol={setSelectedSymbol}
        />

        {/* Middle - Chart Area */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Top - Chart */}
          <div className="min-h-0 flex-1 rounded-lg border border-gray-800 bg-[#1a1d2e] p-4">
            <CandleChart selectedSymbol={selectedSymbol || DEFAULT_SYMBOL} />
          </div>

          {/* Bottom - Order Tabs: about a third of the height, capped both ways */}
          <div className="h-[clamp(200px,32vh,320px)] shrink-0">
            <OrderTabs orders={orders} setOrders={setOrders} loading={loading} />
          </div>
        </div>

        {/* Right Sidebar - Order Placing Panel */}
        <OrderPlacingPanel
          setOrders={setOrders}
          selectedSymbol={selectedSymbol}
          setTableRerender={setTableRerender}
        />
      </main>
    </>
  )
}