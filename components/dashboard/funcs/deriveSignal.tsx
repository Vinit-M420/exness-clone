
export function deriveSignal(prevPrice?: number, newPrice?: number) {
  if (!prevPrice) return "neutral";

  if (newPrice! > prevPrice) return "buy";
  if (newPrice! < prevPrice) return "sell";

  return "neutral";
}
