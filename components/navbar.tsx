'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Poppins, Inter } from 'next/font/google'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AllSymbols_Metadata } from '@/data/allsymbols'
import { Globe, Plus, X, History, LayoutGrid, Settings, CircleUserRound, LogOut } from 'lucide-react'
import Link from 'next/link'

const poppins = Poppins({
  weight: ['600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins'
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
})

const languages = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ru', name: 'русский' },
  { code: 'es', name: 'español' },
  { code: 'fr', name: 'français' },
  { code: 'ar', name: 'العربية' },
  { code: 'he', name: 'עִבְרִית' },
]

type NavbarProps = {
  // Dashboard-only props - omitted (as on the landing/login/signup pages),
  // the symbol tabs, account selector, and toolbar icons simply don't render.
  openSymbols?: string[]
  activeSymbol?: string | null
  onSelectSymbol?: (symbol: string) => void
  onCloseSymbol?: (symbol: string) => void
  onAddSymbol?: (symbol: string) => void
  walletBalance?: { balance: string; currency: string } | null
}

export default function Navbar({
  openSymbols,
  activeSymbol,
  onSelectSymbol,
  onCloseSymbol,
  onAddSymbol,
  walletBalance,
}: NavbarProps = {}) {
  const router = useRouter()
  const isDashboard = !!onSelectSymbol
  const [addTabOpen, setAddTabOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-900/10 bg-background/10 backdrop-blur-sm">
        <div className="flex h-12 items-center justify-between mx-5 gap-4">
            {/* Logo */}
        <h1 className={`${poppins.className} shrink-0 text-2xl tracking-wide font-semibold text-amber-300 `}>
          <Link href="/">
          exness <span className='text-gray-100 tracking-tight'>(Clone)</span>
          </Link>
        </h1>

        {/* Open symbol tabs */}
        {isDashboard && (
          <div className="flex items-center gap-1 overflow-x-auto min-w-0">
            {openSymbols?.map((symbol) => (
              <button
                key={symbol}
                onClick={() => onSelectSymbol?.(symbol)}
                className={`group flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  symbol === activeSymbol
                    ? 'bg-gray-800 text-amber-300'
                    : 'text-gray-300 hover:bg-gray-800/60'
                }`}
              >
                {symbol.replace('BINANCE:', '')}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseSymbol?.(symbol)
                  }}
                  className="rounded-sm p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-700 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            ))}

            <Popover open={addTabOpen} onOpenChange={setAddTabOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-gray-400 hover:text-amber-300 hover:bg-gray-800">
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-0 bg-[#0f1118] border-gray-700">
                <Command className="bg-[#0f1118]">
                  <CommandList className="max-h-64">
                    <CommandEmpty className="py-4 text-center text-xs text-gray-500">
                      No symbols found.
                    </CommandEmpty>
                    <CommandGroup>
                      {AllSymbols_Metadata.map((s) => (
                        <CommandItem
                          key={s.symbol}
                          value={s.symbol + ' ' + s.name}
                          onSelect={() => {
                            onAddSymbol?.(s.symbol)
                            setAddTabOpen(false)
                          }}
                          className="text-xs text-gray-300 aria-selected:bg-gray-800 cursor-pointer"
                        >
                          {s.symbol} <span className="ml-2 text-gray-500">{s.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {isDashboard && (
            <>
              {/* Account selector (static - no Real/Demo switching implemented yet) */}
              <div className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-1.5 text-xs">
                <span className="text-gray-400">Real Standard</span>
                <span className="font-semibold text-gray-100">
                  {walletBalance ? `${Number(walletBalance.balance).toFixed(2)} ${walletBalance.currency}` : '0.00 USD'}
                </span>
              </div>

              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-gray-100 hover:text-[#FFD54F]" title="History">
                <History className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-gray-100 hover:text-[#FFD54F]" title="Layout">
                <LayoutGrid className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-gray-100 hover:text-[#FFD54F]" title="Settings">
                <Settings className="h-5 w-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-gray-100 hover:text-[#FFD54F]">
                    <CircleUserRound className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className={`${inter.className} py-1! px-1! w-36 border-[rgba(255,213,79,0.2)] bg-[#141829] text-gray-100`}
                >
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer gap-2 hover:bg-[rgba(255,213,79,0.1)] hover:text-amber-300 focus:bg-[rgba(255,213,79,0.1)] focus:text-amber-300 text-sm h-8"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={() => setDepositOpen(true)}
                className="h-8 bg-amber-400 text-[#141829] font-semibold hover:bg-amber-300"
              >
                Deposit
              </Button>

              <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
                <DialogContent className="bg-[#141829] border-gray-700 text-gray-100">
                  <DialogHeader>
                    <DialogTitle>Deposit</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      This is a learning project - deposits aren&apos;t wired up to any real
                      payment provider, so no funds can be added here.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* Language Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg text-gray-100 hover:text-[#FFD54F] transition-colors"
                >
                <Globe className="h-5 w-5" />
                <span className="sr-only">Select language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className={`${inter.className} py-1! px-1! w-30 border-[rgba(255,213,79,0.2)] bg-[#141829] text-gray-100`}>
                {languages.map((language) => (
                <DropdownMenuItem
                    key={language.code}
                    className="cursor-pointer hover:bg-[rgba(255,213,79,0.1)] hover:text-amber-300 focus:bg-[rgba(255,213,79,0.1)] focus:text-amber-300 text-md h-8"
                    onClick={() => {
                    console.log(`Selected language: ${language.name}`)
                    // Language switching logic will go here
                    }}
                >
                    {language.name}
                </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
