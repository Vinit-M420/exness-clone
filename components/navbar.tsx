import { Poppins, Inter } from 'next/font/google'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'
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

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-900/10 bg-background/10 backdrop-blur-sm">
        <div className=" flex h-12 items-center justify-between mx-5!">
            {/* Logo */}
        <h1 className={`${poppins.className} text-2xl tracking-wide font-semibold text-[#FFD54F] ml-10`}>
          <Link href="/">
          exness <span className='text-gray-100 tracking-tight'>(Clone)</span>
          </Link>
        </h1>

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
                    // console.log(`Selected language: ${language.name}`)
                    // Language switching logic will go here
                    }}
                >
                    {language.name}
                </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
            </DropdownMenu>
      </div>
    </nav>
  )
}