import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Hero() {
  return (
    <main className="
      relative z-10
      flex flex-col items-center justify-center
      min-h-screen
      px-6 sm:px-8
      text-center
    ">

      {/* Hero Content Wrapper */}
      <div className="flex flex-col items-center w-full max-w-3xl">

        {/* Title */}
        <h1 className="
          text-5xl sm:text-6xl
          font-bold
          leading-[1.08]
          tracking-tight
          mb-6
          animate-[slideUp_0.8s_ease-out_0.2s_both]
        ">
          Trade CFDs with Real-Time Execution
        </h1>

        {/* Subtitle */}
        <p className="
          text-lg sm:text-xl
          text-(--exness-text-dim)
          leading-relaxed
          mb-10
          animate-[slideUp_0.8s_ease-out_0.4s_both]
        ">
          A demo trading platform inspired by Exness. Supports{' '}
          <span className="text-(--exness-gold) font-semibold">market orders</span>,{' '}
          <span className="text-(--exness-gold) font-semibold">limit orders</span>,{' '}
          <span className="text-(--exness-gold) font-semibold">stop-loss</span>,{' '}
          <span className="text-(--exness-gold) font-semibold">take-profit</span>, and{' '}
          <span className="text-(--exness-gold) font-semibold">live price updates</span>.
        </p>

        {/* CTA Buttons */}
        <div className="
          flex gap-6 sm:gap-8
          mb-16
          animate-[slideUp_0.8s_ease-out_0.6s_both]
          max-md:flex-col
          max-md:w-full
          max-md:max-w-[320px]
        ">
          <Button
            asChild
            size="lg"
            className="
              group relative text-lg font-medium
              bg-linear-to-br from-(--exness-gold) to-amber-200
              text-black
              shadow-lg shadow-yellow-400/30
              hover:shadow-yellow-400/40
              hover:-translate-y-0.5
              transition-all duration-300
            "
          >
            <Link href="/login">
              <span className="relative z-10">Log In</span>
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            className="
              group relative text-lg font-medium
              bg-transparent
              border-2 border-(--exness-border)
              text-gray-100
              hover:border-(--exness-gold)
              hover:-translate-y-0.5
              transition-all duration-300
              overflow-hidden
            "
          >
            <Link href="/signup">
              <span className="relative z-10">Sign Up</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer / Copyright */}
      <div className="absolute bottom-8">
        <span className="text-xs text-gray-500">
          © 2026 Exness Clone. Vinit Motghare
        </span>
      </div>

    </main>
  )
}
