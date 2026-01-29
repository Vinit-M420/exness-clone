import { Inter } from "next/font/google";
import "./globals.css";


const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`min-h-screen bg-[#050812] text-[#E8E9ED] ${inter.className}`}>
        {children}
      </body>
    </html>
  );
}