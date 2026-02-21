'use client'

import { useMemo, useState } from "react"
import { Settings, MoreVertical, X, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Order } from "@/types/orderInterface"
import { OrderDetailsModal } from "./orderDetail"

export type OrderTabs = "Open" | "Pending" | "Closed";

type OrdersTabProps = {
  orders: Order[],
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>,
  loading?: boolean,
}

export default function OrderTabs({orders, setOrders, loading} : OrdersTabProps) {
  const [orderTab, setOrderTab] = useState<OrderTabs>("Open")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const tabs: OrderTabs[] = ["Open", "Pending", "Closed"]

  const jwtToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null

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

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order)
    setModalOpen(true)
  }

  const handleUpdateOrder = async (
    orderId: string,
    updates: { stopLoss?: string; takeProfit?: string, triggerPrice?: string }
  ) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/order/edit/${orderId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      )

      if (!res.ok) {
        const error = await res.json()
        console.log("Error response:", error);
        // throw new Error(error.message || 'Failed to update order')
      }
      // console.log(res);
      // Update local state
      setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              stopLoss: updates.stopLoss ? Number(updates.stopLoss) : order.stopLoss,
              takeProfit: updates.takeProfit ? Number(updates.takeProfit) : order.takeProfit,
            }
          : order
      )
    )
    } catch (error) {
      console.error('Update order error:', error)
      throw error
    }
  }

  const handleCloseOrder = async (orderId: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/order/exit/${orderId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to close order')
      }

      // Update order status to closed
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: 'closed' } : order
        )
      )
    } catch (error) {
      console.error('Close order error:', error)
      throw error
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/order/order/${orderId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to delete order')
      }

      // Remove from local state
      setOrders((prev) => prev.filter((order) => order.id !== orderId))
    } catch (error) {
      console.error('Delete order error:', error)
      throw error
    }
  }

  return (
    <>
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
                  {orderTab !== "Pending" && (
                  <TableHead className="text-xs text-gray-500 font-normal">
                    {`Opened At`}
                  </TableHead>
                  )}
                  {orderTab === "Closed" && (
                   <TableHead className="text-xs text-gray-500 font-normal">
                    {`Closed At`}
                  </TableHead>
                  )}
                  {orderTab === "Pending" && (
                   <TableHead className="text-xs text-gray-500 font-normal">
                    {`Created At`}
                  </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredOrders.map((order) => {
                  const pnlValue = order.pnl != null ? Number(order.pnl) : null

                  return (
                    <TableRow 
                      key={order.id} 
                      className="border-b border-gray-800/50 hover:bg-[#1f2333] cursor-pointer"
                      onClick={() => handleRowClick(order)}
                    >
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
                      {orderTab !== "Pending" && (
                      <TableCell className="text-gray-400 text-xs">
                        {formatDate(order.openedAt)}
                      </TableCell>
                      )}
                      {orderTab === "Pending" && (
                      <TableCell className="text-gray-400 text-xs">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      )}
                      {orderTab === "Closed" && (
                      <TableCell className="text-gray-400 text-xs">
                        {formatDate(order.closedAt)}
                      </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpdate={handleUpdateOrder}
        onCloseOrder={handleCloseOrder}
        onDelete={handleDeleteOrder}
        orderTab={orderTab}
      />
    </>
  )
}