'use client'

import { useMemo, useState } from "react"
import { Settings, MoreVertical, X, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Order } from "@/types/orderInterface"

type OrderTabs = "Open" | "Pending" | "Closed";

type OrdersTabProps = {
  orders: Order[]
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>
  loading?: boolean
}

export default function OrderTabs({orders, loading} : OrdersTabProps) {
  
  const [orderTab, setOrderTab] = useState<OrderTabs>("Open")
  const tabs: OrderTabs[] = ["Open", "Pending", "Closed"]


  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderTab === "Open") return order.status === "open"
      if (orderTab === "Pending") return order.status === "pending"
      if (orderTab === "Closed") return order.status === "closed"
      return false
    })
  }, [orders, orderTab])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-[#1a1d2e] border border-gray-800 rounded-lg flex flex-col h-full">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setOrderTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative
                ${orderTab === tab
                  ? "text-gray-200"
                  : "text-gray-500 hover:text-gray-300"}
              `}
            >
              {tab}
              {orderTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-gray-800">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-gray-800">
            <MoreVertical className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-gray-800">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-sm text-gray-400 animate-pulse">
              Loading orders...
            </p>
          </div>
        ) : !filteredOrders || filteredOrders.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-sm text-gray-400">
                No {orderTab.toLowerCase()} positions
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-800 hover:bg-transparent">
                <TableHead className="text-xs text-gray-500 font-normal">Symbol</TableHead>
                <TableHead className="text-xs text-gray-500 font-normal">Type</TableHead>
                <TableHead className="text-xs text-gray-500 font-normal">Side</TableHead>
                <TableHead className="text-xs text-gray-500 font-normal text-right">Lots</TableHead>
                {orderTab === "Pending" && (
                  <TableHead className="text-xs text-gray-500 font-normal text-right">Trigger</TableHead>
                )}
                {orderTab !== "Pending" && (
                  <TableHead className="text-xs text-gray-500 font-normal text-right">Entry</TableHead>
                )}
                {orderTab === "Closed" && (
                  <TableHead className="text-xs text-gray-500 font-normal text-right">Exit</TableHead>
                )}
                {orderTab !== "Pending" && (
                  <TableHead className="text-xs text-gray-500 font-normal text-right">P&L</TableHead>
                )}
                {orderTab !== "Closed" && (
                  <>
                    <TableHead className="text-xs text-gray-500 font-normal text-right">S/L</TableHead>
                    <TableHead className="text-xs text-gray-500 font-normal text-right">T/P</TableHead>
                  </>
                )}
                <TableHead className="text-xs text-gray-500 font-normal">
                  {orderTab === "Closed" ? "Closed At" : "Opened At"}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredOrders.map((order) => {
                const pnlValue = order.pnl != null ? Number(order.pnl) : null

                return (
                  <TableRow key={order.id} className="border-b border-gray-800/50 hover:bg-[#1f2333]">
                    <TableCell className="font-medium text-gray-200">
                      {order.symbol}
                    </TableCell>

                    <TableCell className="text-gray-400 capitalize text-sm">
                      {order.orderType}
                    </TableCell>

                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          order.side === 'buy'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {order.side.toUpperCase()}
                      </span>
                    </TableCell>

                    <TableCell className="text-right font-mono text-sm">
                      {order.lotSize}
                    </TableCell>
                    
                    {orderTab === "Pending" && (    
                      <TableCell className="text-right font-mono text-sm text-gray-300">
                        {order.triggerPrice ?? "-"}
                      </TableCell>
                    )}
                    
                    {orderTab !== "Pending" && (  
                      <TableCell className="text-right font-mono text-sm text-gray-300">
                        {order.entryPrice ?? "-"}
                      </TableCell>
                    )}

                    {orderTab === "Closed" && (
                      <TableCell className="text-right font-mono text-sm text-gray-300">
                        {order.exitPrice ?? "-"}
                      </TableCell>
                    )}

                    {orderTab !== "Pending" && (
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {pnlValue != null ? (
                          <span className={pnlValue >= 0 ? "text-green-400" : "text-red-400"}>
                          {pnlValue >= 0 ? "+" : "-"}${Math.abs(pnlValue).toFixed(2)}
                          </span>
                        ) : "-"}
                      </TableCell>
                    )}

                    {orderTab !== "Closed" && (
                      <>
                        <TableCell className="text-right font-mono text-sm text-gray-400">
                          {order.stopLoss != null ? Number(order.stopLoss).toFixed(2) : "-"}
                        </TableCell>

                        <TableCell className="text-right font-mono text-sm text-gray-400">
                          {order.takeProfit != null ? Number(order.takeProfit).toFixed(2) : "-"}
                        </TableCell>
                      </>
                    )}

                    <TableCell className="text-gray-400 text-xs">
                      {orderTab === "Closed" && order.closedAt
                        ? formatDate(order.closedAt)
                        : formatDate(order.openedAt)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}