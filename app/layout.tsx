import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import dotenv from "dotenv";
dotenv.config();

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  // preload: true,
})

export const metadata: Metadata = {
  title: "exness",
  description: "A learning project simulating a CFD trading platform with real-time price feeds, market/limit orders, and stop loss / take profit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`min-h-screen bg-[#050812] text-[#E8E9ED] ${inter.className}`}>
        {children}
        {/* Top-right of the chart area: clear of the navbar (48px) and the
            320px order panel, so toasts never cover the Buy/Sell buttons */}
        <Toaster position="top-right" offset={{ top: 64, right: 336 }} closeButton />
      </body>
    </html>
  );
}