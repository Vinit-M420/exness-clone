import { SymbolType } from "@/types/symbolType";
import { CSS } from '@dnd-kit/utilities'
import { TableCell, TableRow } from "@/components/ui/table";
import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
         AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,  AlertDialogTrigger, } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { Ticker } from "@/types/tickerType";

interface SortableRowProps {
  item: SymbolType
  ticker?: Ticker
  onDelete: (symbol: string) => void
}

export function SortableRow({ item, ticker, onDelete }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.symbol })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className="hover:bg-[#1f2333] border-b border-gray-800/50 group"
    >
      {/* Symbol */}
      <TableCell className="py-2 w-[33.33%] border-r border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 shrink-0"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
            <div className="text-sm font-medium text-gray-200 truncate">
              {item.symbol.replace('BINANCE:', '')}
            </div>
          </div>

          {/* Delete Button - Shows on Hover */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#1a1d2e] border-gray-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-gray-200">
                  Remove from watchlist?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  Are you sure you want to remove <span className="font-semibold text-gray-300">{item.symbol}</span> from your watchlist?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-200">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(item.symbol)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>

      {/* Signal Indicator */}
      <TableCell className="py-2 w-[16.67%]">
        <div className="flex items-center justify-center">
          <div className={`w-6 h-6 rounded ${ticker?.signal === 'buy' ? 'bg-green-500/20' : ticker?.signal === 'sell' ? 'bg-red-500/20' : 'bg-gray-500/20'} flex items-center justify-center`}>
            <div
              className={`w-2 h-3 ${ticker?.signal === 'buy'  ? 'bg-green-500' : ticker?.signal === 'sell' ? 'bg-red-500' : 'bg-gray-500/20' }`}
              style={{ clipPath: ticker?.signal === 'buy'  ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : ticker?.signal === 'sell' ? 'polygon(0% 0%, 100% 0%, 50% 100%)' : 'none' }}
            />
          </div>
        </div>
      </TableCell>

      {/* Bid */}
      <TableCell className="py-2 w-[33.33%]">
        <div className={`flex items-center justify-end text-sm font-mono ${item.signal ? 'text-green-400' : 'text-red-400'} ${item.signal ? 'bg-green-500/10' : 'bg-red-500/10'} px-2 rounded`}>
          {ticker?.bid?.toFixed(2) ?? "-"}
        </div>
      </TableCell>

      {/* Ask */}
      <TableCell className="py-2 w-[16.67%]">
        <div className="flex items-center justify-end text-sm font-mono text-gray-400">
          {ticker?.ask?.toFixed(2) ?? "-"}
        </div>
      </TableCell>
    </TableRow>
  )
}