import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Poppins } from 'next/font/google'
import BackgroundEffects from '@/components/BackgroundEffects'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600'],
})

export default function NotFound() {
  return (
    <>
      <BackgroundEffects />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center gap-6">
        <h1 className="text-8xl font-bold text-(--exness-gold) tracking-wider">
          404
        </h1>
        <p className={`text-xl text-(--exness-text-dim) max-w-md ${poppins.className}`}>
          {`We can't seem to find the page you are looking for.`}
        </p>
        <Link href="/">
          <Button 
            className={`${poppins.className} bg-linear-to-br from-(--exness-gold) to-amber-200 text-black font-semibold px-8 py-6 text-base hover:shadow-lg hover:shadow-yellow-400/30 hover:-translate-y-0.5 transition-all duration-300`}
          >
            Back to Home
          </Button>
        </Link>
      </div>
    </>
  )
}