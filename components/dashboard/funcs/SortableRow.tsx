import { FSymbol } from "@/types/symbolType";
import { CSS } from '@dnd-kit/utilities'
import { TableCell, TableRow } from "@/components/ui/table";
import { useSortable } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";

interface SortableRowProps {
  item: FSymbol
}

export function SortableRow({ item }: SortableRowProps) {
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
        <div className="flex items-center gap-2">
          <button
            className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <div className="text-sm font-medium text-gray-200 truncate">
            {item.symbol.replace('BINANCE:', '')}
          </div>
        </div>
      </TableCell>

      {/* Signal Indicator */}
      <TableCell className="py-2 w-[16.67%]">
        <div className="flex items-center justify-center">
          <div className={`w-6 h-6 rounded ${item.isUp ? 'bg-green-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
            <div
              className={`w-2 h-3 ${item.isUp ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ clipPath: item.isUp ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)' }}
            />
          </div>
        </div>
      </TableCell>

      {/* Bid */}
      <TableCell className="py-2 w-[33.33%]">
        <div className={`flex items-center justify-end text-sm font-mono ${item.isUp ? 'text-green-400' : 'text-red-400'} ${item.isUp ? 'bg-green-500/10' : 'bg-red-500/10'} px-2 rounded`}>
          {item.price}
        </div>
      </TableCell>

      {/* Ask */}
      <TableCell className="py-2 w-[16.67%]">
        <div className="flex items-center justify-end text-sm font-mono text-gray-400">
          {item.bid}
        </div>
      </TableCell>
    </TableRow>
  )
}