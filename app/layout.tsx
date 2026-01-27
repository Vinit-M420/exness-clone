import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Exness Clone - Trade CFDs with Real-Time Execution',
  description: 'A demo trading platform inspired by Exness. Supports market & limit orders, stop-loss, take-profit, and live price updates.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}