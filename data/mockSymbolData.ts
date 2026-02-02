import { FSymbol } from "@/types/Fsymbol"

export const mockinitialSymbols: FSymbol[] = [
  { symbol: "BINANCE:BTCUSDT", name: "Bitcoin / USDT", type: "crypto", price: "111,242.56", change: "+2.45", isUp: true, bid: "111,240", ask: "111,245" },
  { symbol: "XAUUSD", name: "Gold / USD", type: "metal", price: "4,242.418", change: "-0.32", isUp: false, bid: "4,242.40", ask: "4,242.43" },
  { symbol: "AAPL", name: "Apple Inc", type: "stock", price: "249.76", change: "-1.24", isUp: false, bid: "249.75", ask: "249.77" },
  { symbol: "EURUSD", name: "Euro / USD", type: "forex", price: "1.16544", change: "+0.15", isUp: true, bid: "1.16540", ask: "1.16548" },
  { symbol: "GBPUSD", name: "British Pound / USD", type: "forex", price: "1.34363", change: "-0.08", isUp: false, bid: "1.34360", ask: "1.34366" },
  { symbol: "USDJPY", name: "USD / Japanese Yen", type: "forex", price: "151.243", change: "-0.42", isUp: false, bid: "151.240", ask: "151.246" },
  { symbol: "USTEC", name: "US Tech 100", type: "index", price: "24,912.89", change: "+1.85", isUp: true, bid: "24,912", ask: "24,913" },
  { symbol: "USOIL", name: "US Crude Oil", type: "commodity", price: "58.292", change: "+0.56", isUp: true, bid: "58.29", ask: "58.30" },
]