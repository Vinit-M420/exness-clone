'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Order } from '@/types/orderInterface'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TPSLInput } from '../TPSLinput'

interface OrderDetailsModalProps {
  order: Order | null
  open: boolean
  onClose: () => void
  onUpdate: (orderId: string, updates: { stopLoss?: string; takeProfit?: string }) => Promise<void>
  onCloseOrder: (orderId: string) => Promise<void>
  onDelete: (orderId: string) => Promise<void>
}

export function OrderDetailsModal({
  order,
  open,
  onClose,
  onUpdate,
  onCloseOrder,
  onDelete,
}: OrderDetailsModalProps) {
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Initialize values when order changes
  useState(() => {
    if (order) {
      setStopLoss(order.stopLoss?.toString() || '')
      setTakeProfit(order.takeProfit?.toString() || '')
    }
  })

  if (!order) return null

  const handleUpdate = async () => {
    setLoading(true)
    try {
      await onUpdate(order.id, {
        ...(stopLoss && { stopLoss }),
        ...(takeProfit && { takeProfit }),
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
            <DialogTitle className="text-xl font-semibold flex items-center justify-between">
              <span>Order Details</span>
              <span
                className={`text-sm px-2 py-1 rounded ${
                  order.status === 'open'
                    ? 'bg-green-500/10 text-green-400'
                    : order.status === 'pending'
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : 'bg-gray-500/10 text-gray-400'
                }`}
              >
                {order.status.toUpperCase()}
              </span>
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {order.symbol} • {order.orderType.toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Order Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Side</label>
                <div
                  className={`mt-1 inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
                    order.side === 'buy'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {order.side.toUpperCase()}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Lot Size</label>
                <div className="mt-1 text-sm font-mono text-gray-300">
                  {order.lotSize}
                </div>
              </div>

              {order.status === 'pending' && order.triggerPrice && (
                <div>
                  <label className="text-xs text-gray-500">Trigger Price</label>
                  <div className="mt-1 text-sm font-mono text-gray-300">
                    {Number(order.triggerPrice).toFixed(2)}
                  </div>
                </div>
              )}

              {order.status !== 'pending' && order.entryPrice && (
                <div>
                  <label className="text-xs text-gray-500">Entry Price</label>
                  <div className="mt-1 text-sm font-mono text-gray-300">
                    {Number(order.entryPrice).toFixed(2)}
                  </div>
                </div>
              )}

              {order.status === 'closed' && order.exitPrice && (
                <div>
                  <label className="text-xs text-gray-500">Exit Price</label>
                  <div className="mt-1 text-sm font-mono text-gray-300">
                    {Number(order.exitPrice).toFixed(2)}
                  </div>
                </div>
              )}

              {order.status !== 'pending' && pnlValue !== null && (
                <div>
                  <label className="text-xs text-gray-500">P&L</label>
                  <div
                    className={`mt-1 text-sm font-mono font-semibold ${
                      pnlValue >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {pnlValue >= 0 ? '+' : '-'}${Math.abs(pnlValue).toFixed(2)}
                  </div>
                </div>
              )}

              {/* {order.marginUsed && (
                <div>
                  <label className="text-xs text-gray-500">Margin Used</label>
                  <div className="mt-1 text-sm font-mono text-gray-300">
                    ${Number(order.marginUsed).toFixed(2)}
                  </div>
                </div>
              )} */}

              <div className="col-span-2">
                <label className="text-xs text-gray-500">Opened At</label>
                <div className="mt-1 text-sm text-gray-300">
                  {formatDate(order.openedAt)}
                </div>
              </div>

              {order.status === 'closed' && order.closedAt && (
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Closed At</label>
                  <div className="mt-1 text-sm text-gray-300">
                    {formatDate(order.closedAt)}
                  </div>
                </div>
              )}
            </div>

            {/* Editable Fields for Open/Pending Orders */}
            {(order.status === 'open' || order.status === 'pending') && (
              <div className="space-y-4 pt-4 border-t border-gray-700">
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

          <DialogFooter className="gap-2">
            {/* Delete Button for Pending Orders */}
            {order.status === 'pending' && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="border-red-700 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Order
              </Button>
            )}

            {/* Close Button for Open Orders */}
            {order.status === 'open' && (
              <Button
                variant="outline"
                onClick={() => setShowCloseConfirm(true)}
                disabled={loading}
                className="border-orange-700 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
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
                className="bg-linear-to-br from-(--exness-gold) to-amber-200 text-black hover:from-yellow-500 hover:to-amber-300"
              >
                {loading ? 'Updating...' : 'Update Order'}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Close
            </Button>
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
              {loading ? 'Deleting...' : 'Delete Order'}
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