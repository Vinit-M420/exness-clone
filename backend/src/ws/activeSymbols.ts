const activeSymbols = new Map<string, number>(); 

export function addSymbols(symbol: string){
  const count = activeSymbols.get(symbol) ?? 0;
  activeSymbols.set(symbol, count + 1);
  return count === 0; // true = first time, false = already exists
}

export function removeSymbols(symbol: string){
    const count = activeSymbols.get(symbol)?? 0;
    if (!count) return false;

    if (count === 1){
        activeSymbols.delete(symbol);
        return true;
    }

    activeSymbols.set(symbol, count - 1);
    return false;
}