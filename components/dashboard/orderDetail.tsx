'use client'

import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Order } from '@/types/orderInterface'
import { Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, } from '@/components/ui/alert-dialog'
import { TPSLInput } from '../TPSLinput'

type OrderTabs = "Open" | "Pending" | "Closed"

interface OrderDetailsModalProps {
  order: Order | null
  open: boolean
  onClose: () => void
  onUpdate: (orderId: string, updates: { stopLoss?: string; takeProfit?: string; triggerPrice?: string }) => Promise<void>
  onCloseOrder: (orderId: string) => Promise<void>
  onDelete: (orderId: string) => Promise<void>
  orderTab: OrderTabs
}

export function OrderDetailsModal({
  order,
  open,
  onClose,
  onUpdate,
  onCloseOrder,
  onDelete,
  orderTab
}: OrderDetailsModalProps) {
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [triggerPrice, setTriggerPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Initialize values when order changes
  useEffect(() => {
    if (order) {
      setTriggerPrice(order.triggerPrice?.toString() || '')
      setStopLoss(order.stopLoss?.toString() || '')
      setTakeProfit(order.takeProfit?.toString() || '')
    }
  }, [order])

  if (!order) return null

  const handleUpdate = async () => {
    setLoading(true)
    try {
      await onUpdate(order.id, {
        ...(stopLoss && { stopLoss }),
        ...(takeProfit && { takeProfit }),
        // ...(triggerPrice && order.status === 'pending' && { triggerPrice }),
      })
      onClose()
    } catch (error) {
      console.error('Failed to update order:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseOrder = async () => {
    setLoading(true)
    try {
      await onCloseOrder(order.id)
      setShowCloseConfirm(false)
      onClose()
    } catch (error) {
      console.error('Failed to close order:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await onDelete(order.id)
      setShowDeleteConfirm(false)
      onClose()
    } catch (error) {
      console.error('Failed to delete order:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const pnlValue = order.pnl ? Number(order.pnl) : null

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-[#1a1d2e] border-gray-700 text-gray-200 max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold">
                  Order Details
                </DialogTitle>
                <DialogDescription className="text-gray-400 mt-1">
                  {order.symbol} • {order.orderType.toUpperCase()}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Order Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Row 1: Status and Side */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Status</label>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    order.status === 'open'
                      ? 'bg-green-500/10 text-green-400'
                      : order.status === 'pending'
                      ? 'bg-yellow-500/10 text-yellow-400'
                      : 'bg-gray-500/10 text-gray-400'
                  }`}
                >
                  {order.status.toUpperCase()}
                </span>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Side</label>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    order.side === 'buy'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {order.side.toUpperCase()}
                </span>
              </div>

              {/* Row 2: Lot Size and Entry/Trigger Price */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Lot Size</label>
                <div className="text-sm font-mono text-gray-300">
                  {order.lotSize}
                </div>
              </div>

              {order.status === 'pending' && order.triggerPrice ? (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Trigger Price</label>
                  <div className="text-sm font-mono text-gray-300">
                    {Number(order.triggerPrice).toFixed(2)}
                  </div>
                </div>
              ) : order.entryPrice ? (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Entry Price</label>
                  <div className="text-sm font-mono text-gray-300">
                    {Number(order.entryPrice).toFixed(2)}
                  </div>
                </div>
              ) : null}

              {/* Exit Price and P&L (if closed) */}
              {order.status === 'closed' && order.exitPrice && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Exit Price</label>
                  <div className="text-sm font-mono text-gray-300">
                    {Number(order.exitPrice).toFixed(2)}
                  </div>
                </div>
              )}

              {order.status !== 'pending' && pnlValue !== null && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">P&L</label>
                  <div
                    className={`text-sm font-mono font-semibold ${
                      pnlValue >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {pnlValue >= 0 ? '+' : '-'}${Math.abs(pnlValue).toFixed(2)}
                  </div>
                </div>
              )}

              {/* Dates */}
              {order.status === 'open' &&
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Opened At</label>
                <div className="text-sm text-gray-300">
                  {formatDate(order.openedAt)}
                </div>
              </div>
              }

              {order.status === 'pending' &&
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Created At</label>
                <div className="text-sm text-gray-300">
                  {formatDate(order.createdAt)}
                </div>
              </div>
              }

              {order.status === 'closed' && order.closedAt && (
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Closed At</label>
                  <div className="text-sm text-gray-300">
                    {formatDate(order.closedAt)}
                  </div>
                </div>
              )}
            </div>

            {/* Editable Fields for Open/Pending Orders */}
            {(order.status === 'open' || order.status === 'pending') && (
              <div className="space-y-4 pt-4 border-t border-gray-700">
                {orderTab === 'Pending' && (
                  <TPSLInput
                    label="Trigger Price"
                    value={triggerPrice}
                    onChange={setTriggerPrice}
                  /> 
                )}
                 
                <TPSLInput
                  label="Stop Loss"
                  value={stopLoss}
                  onChange={setStopLoss}
                />

                <TPSLInput
                  label="Take Profit"
                  value={takeProfit}
                  onChange={setTakeProfit}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {/* Delete Button for Pending Orders */}
            {order.status === 'pending' && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="flex-1 border-red-700 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}

            {/* Close Button for Open Orders */}
            {order.status === 'open' && (
              <Button
                variant="outline"
                onClick={() => setShowCloseConfirm(true)}
                disabled={loading}
                className="flex-1 border-orange-700 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
              >
                <X className="h-4 w-4 mr-2" />
                Close Position
              </Button>
            )}

            {/* Update Button for Open/Pending Orders */}
            {(order.status === 'open' || order.status === 'pending') && (
              <Button
                onClick={handleUpdate}
                disabled={loading}
                className="flex-1 bg-linear-to-br from-(--exness-gold) to-amber-200 text-black hover:from-yellow-500 hover:to-amber-300"
              >
                {loading ? 'Updating...' : 'Update'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[#1a1d2e] border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-200">
              Delete Pending Order?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this pending order for{' '}
              <span className="font-semibold text-gray-300">{order.symbol}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close Order Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent className="bg-[#1a1d2e] border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-200">
              Close Position?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to close this position for{' '}
              <span className="font-semibold text-gray-300">{order.symbol}</span>?
              {pnlValue !== null && (
                <span
                  className={`block mt-2 font-semibold ${
                    pnlValue >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  Current P&L: {pnlValue >= 0 ? '+' : '-'}$
                  {Math.abs(pnlValue).toFixed(2)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseOrder}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? 'Closing...' : 'Close Position'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}