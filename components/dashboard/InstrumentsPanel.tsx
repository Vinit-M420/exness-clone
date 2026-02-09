'use client'
import { useState, useEffect } from 'react'
import { Search as SearchIcon, X, MoreVertical } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, } from '@dnd-kit/core'
import { arrayMove, SortableContext,  sortableKeyboardCoordinates, verticalListSortingStrategy, } from '@dnd-kit/sortable'
import { mockinitialSymbols } from '@/data/mockSymbolData'
import { FSymbol } from '@/types/Fsymbol'
import { SortableRow } from './funcs/SortableRow'



export default function InstrumentsPanel() {
  const [searchQuery, setSearchQuery] = useState('')
  const [symbols, setSymbols] = useState<FSymbol[]>(() => {
  // This only runs ONCE on initial render
    if (typeof window === 'undefined') return mockinitialSymbols
    
    const savedOrder = localStorage.getItem('symbolsOrder')
    if (savedOrder) {
      try {
        return JSON.parse(savedOrder)
      } catch {
        return mockinitialSymbols
      }
    }
    return mockinitialSymbols
  })

  // Save to localStorage whenever order changes
  useEffect(() => {
    if (symbols.length > 0) {
      localStorage.setItem('symbolsOrder', JSON.stringify(symbols))
    }
  }, [symbols])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSymbols((items) => {
        const oldIndex = items.findIndex((item) => item.symbol === active.id)
        const newIndex = items.findIndex((item) => item.symbol === over.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const filteredSymbols = symbols.filter(s =>
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-80 h-[calc(100vh-48px)] bg-[#1a1d2e] border-t-3 border-r-2 border-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
          Instruments
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-200 hover:bg-gray-800">
            <MoreVertical className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-200 hover:bg-gray-800">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-gray-800">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#0f1118] border-gray-700 text-gray-300 placeholder:text-gray-500 focus:border-gray-600 focus:ring-0 h-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Table className="w-full table-fixed ">
          <TableHeader className="sticky top-0 z-10 bg-[#1a1d2e]">
            <TableRow className="border-b border-gray-800 hover:bg-transparent">
              <TableHead className="text-xs text-gray-500 font-normal w-[33.33%] text-center">
                Symbol
              </TableHead>
              <TableHead className="text-xs text-gray-500 font-normal w-[16.67%] text-center">
                Signal
              </TableHead>
              <TableHead className="text-xs text-gray-500 font-normal w-[33.33%] text-center">
                Bid
              </TableHead>
              <TableHead className="text-xs text-gray-500 font-normal w-[16.67%] text-center">
                Ask
              </TableHead>
            </TableRow>
          </TableHeader>
        </Table>

        <div className="flex-1 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableBody>
                <SortableContext
                  items={filteredSymbols.map((s) => s.symbol)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredSymbols.map((item) => (
                    <SortableRow key={item.symbol} item={item} />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </div>
      </div>
    </div>
  )
}