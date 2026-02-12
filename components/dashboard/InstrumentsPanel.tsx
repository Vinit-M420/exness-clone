'use client'

import { useEffect, useState } from 'react'
import { Search as SearchIcon, X, MoreVertical, Plus, } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { AllSymbols_Metadata } from '@/data/allsymbols'
import { SymbolType } from '@/types/symbolType'
import { SortableRow } from './funcs/SortableRow'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, } from '@dnd-kit/core'
import { arrayMove, SortableContext,  sortableKeyboardCoordinates, verticalListSortingStrategy,} from '@dnd-kit/sortable'
import { updateWatchlistOnServer } from './funcs/updateWatchlistOnServer'

export default function InstrumentsPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const jwtToken = localStorage.getItem("token")
  const [symbols, setSymbols] = useState<SymbolType[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/v1/user/watchlist`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': "application/json"},
          }
        );

        if (!res.ok) {
          console.log("No watchlist found");
          setLoading(false);
          return;
        }

        const data = await res.json();
        // console.log("data:" , data);
        // data.symbolList contains DB rows
        const sorted = data.symbolList.sort(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any, b: any) => a.orderIndex - b.orderIndex
        );
        // console.log("sorted:" , sorted);
        // Now merge with metadata if needed
        setSymbols(sorted);
      } catch (err) {
        console.error("Failed to fetch watchlist", err);
      } finally {
        setLoading(false);
      }
    };

    if (jwtToken) fetchWatchlist();
    
  }, [jwtToken]);


  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSymbols((items) => {
        const oldIndex = items.findIndex((item) => item.symbol === active.id)
        const newIndex = items.findIndex((item) => item.symbol === over.id)
        const reordered =  arrayMove(items, oldIndex, newIndex)
        // console.log(reordered);
        // if (jwtToken) updateWatchlistOnServer(reordered, jwtToken);
        return reordered;
      })
    }
  }

  useEffect(() => {
    if (jwtToken && symbols.length > 0) {
      updateWatchlistOnServer(symbols, jwtToken);
    }
  }, [jwtToken, symbols]);

  // Filter symbols based on search query
  const filteredSymbols = AllSymbols_Metadata.filter(s =>
    searchQuery === '' || 
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group symbols by typeany
  const groupedSymbols: Record<string, typeof AllSymbols_Metadata> = {}

  filteredSymbols.forEach(symbol => {
    const type = symbol.type
    if (!groupedSymbols[type]) 
      groupedSymbols[type] = [];
    
    groupedSymbols[type].push(symbol);
  })

  const addSymbolToList = (symbol: SymbolType) => {
    setSymbols((prev) => {
      const exists = prev.some(
        (s) => s.symbol === symbol.symbol
      )
      if (exists) return prev
      const updated  = [...prev, symbol]
      if (jwtToken) updateWatchlistOnServer(updated, jwtToken);
      return updated;
    });
    setOpen(false)
    setSearchQuery('')
  }

  // const openChart = (symbol: SymbolType) => {
  //   console.log('Opening chart for:', symbol)
  //   setOpen(false)
  //   setSearchQuery('')
  //   // TODO: Open chart
  // }

   const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

      {/* Search with Command Popover */}
      <div className="px-3 py-3 border-b border-gray-800">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="Search instruments..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setOpen(true) // Open popover when typing
                }}
                // onFocus={() => setOpen(true)}
                className="pl-10 bg-[#0f1118] border-gray-700 text-gray-300 placeholder:text-gray-500 focus:border-gray-600 focus:ring-0 h-9"
              />
            </div>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="w-73 p-0 bg-[#0f1118] border border-gray-700 shadow-2xl"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command className="bg-[#0f1118]">
              <CommandList className="">
                {filteredSymbols.length === 0 ? (
                  <CommandEmpty className="py-6 text-center text-sm text-gray-500">
                    No instruments found.
                  </CommandEmpty>
                ) : (
                  <>
                    {Object.entries(groupedSymbols).map(([type, symbols]) => (
                      <CommandGroup 
                        key={type} 
                        heading={type.toUpperCase()}
                        className="text-xs text-gray-500 px-2 py-1.5"
                      >
                        {symbols.map((symbol) => (
                          <CommandItem
                            key={symbol.symbol}
                            value={symbol.symbol + ' ' + symbol.name} // For search matching
                            className="group flex items-center justify-between px-3 py-2 aria-selected:bg-[#1a1d2e] cursor-pointer"
                            onSelect={() => {
                              // Optional: auto-add on select
                              // addSymbolToList(symbol)
                            }}
                          >
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-300 truncate">
                                {symbol.symbol} 
                                {/* .replace("BINANCE:", '') */}
                              </span>
                              <span className="text-xs text-gray-500 truncate">
                                {symbol.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-aria-selected:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addSymbolToList(symbol)
                                }}
                                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-green-400 transition-colors"
                                title="Add to watchlist"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>

                              {/* <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openChart(symbol)
                                }}
                                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-blue-400 transition-colors"
                                title="View chart"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button> */}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Table className="w-full table-fixed">
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

        {/* Commented drag-and-drop section remains untouched */}
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
                  {symbols.map((item) => (
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