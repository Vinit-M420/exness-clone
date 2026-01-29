import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Hero(){
    
    return (
        <main className="relative z-10 flex flex-col gap-10 items-center justify-center min-h-screen px-8 text-center">
        
        {/* Logo */}
        {/* <div className="text-5xl font-bold mb-12 tracking-tight bg-linear-to-br from-[#FFD54F] to-[#FFE57F] bg-clip-text text-transparent animate-[slideDown_0.8s_ease-out]">
          exness (Clone)
        </div> */}
        
        {/* Hero Title */}
        <h1 className="text-4xl font-bold mb-6 leading-[1.1] tracking-tight animate-[slideUp_0.8s_ease-out_0.2s_both]">
          Trade CFDs with Real-Time Execution
        </h1>
        
        {/* Hero Subtitle */}
        <p className="text-xl text-(--exness-text-dim) max-w-[600px] mx-auto mb-12 leading-relaxed animate-[slideUp_0.8s_ease-out_0.4s_both]">
          A demo trading platform inspired by Exness. Supports{' '}
          <span className="text-(--exness-gold) font-semibold">market orders,</span>{' '}
          <span className="text-(--exness-gold) font-semibold">limit orders</span>,{' '}
          <span className="text-(--exness-gold) font-semibold">stop-loss</span>,{' '}
          <span className="text-(--exness-gold) font-semibold">take-profit</span>, and{' '}
          <span className="text-(--exness-gold) font-semibold">live price updates</span>.
        </p>

        {/* <div className="flex flex-wrap items-center gap-2 md:flex-row"> */}
 

        {/* </div> */}
          
        {/* CTA Buttons */}
        <div className="flex gap-10 mb-12 animate-[slideUp_0.8s_ease-out_0.6s_both] max-md:flex-col max-md:w-full max-md:max-w-[300px]">
          <Button
            asChild
            size="lg"
            className="group relative p-4!  text-lg font-medium bg-linear-to-br from-(--exness-gold) to-amber-200 text-black shadow-lg shadow-yellow-400/30 hover:shadow-yellow-400/40 hover:-translate-y-0.5
            hover:bg-linear-to-br transition-all duration-300 overflow-hidden">
            <Link href="/login">
              <span className="relative z-10">Log In</span>
            </Link>
        </Button>
          
          <Button
            asChild
            size="lg"
            className="group relative p-4! text-lg font-medium cursor-pointer transition-all duration-300 bg-transparent border-2 border-(--exness-border) hover:border-(--exness-gold) text-gray-100 overflow-hidden hover:bg-background hover:-translate-y-0.5
            before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:w-0 before:h-0 before:rounded-full before:bg-[rgba(255,255,255,0.2)] before:-translate-x-1/2 before:-translate-y-1/2 before:transition-all before:duration-[0.6s] hover:before:w-[300px] hover:before:h-[300px]">
            <Link href="/signup">
              <span className="relative z-10">Sign Up</span>
            </Link>
        </Button>

        </div>

        {/* Features (commented out in original) */}
        {/* <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-8 max-w-[900px] mx-auto animate-[slideUp_0.8s_ease-out_0.8s_both] max-md:grid-cols-1">
          {[
            { icon: '⚡', title: 'Real-Time Execution', text: 'Lightning-fast order processing' },
            { icon: '📊', title: 'Advanced Orders', text: 'Market, limit, stop-loss & more' },
            { icon: '🔒', title: 'Secure Trading', text: 'Bank-grade security protocols' },
            { icon: '📈', title: 'Live Updates', text: 'Real-time price feeds' }
          ].map((feature, i) => (
            <div 
              key={i}
              className="p-6 bg-[var(--exness-card)] rounded-xl border border-[var(--exness-border)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--exness-gold)] hover:shadow-[0_8px_24px_rgba(255,213,79,0.1)]"
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <div className="text-base font-semibold text-(--exness-gold) mb-2">
                {feature.title}
              </div>
              <div className="text-sm text-[var(--exness-text-dim)] leading-relaxed">
                {feature.text}
              </div>
            </div>
          ))}
        </div> */}

        <div className='absolute bottom-10 flex justify-center'>
          <span className='text-gray-500'>Copyright © 2026 Exness Clone. Vinit Motghare</span>
        </div>
      </main>
    )
}