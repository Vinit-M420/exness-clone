// priceStore.ts
const priceStore = new Map<string, number>();

export function set(symbol: string, price: number) {
  priceStore.set(symbol, price);
}

export function get(symbol: string) {
  return priceStore.get(symbol);
}

export function clear() {
  priceStore.clear();
}