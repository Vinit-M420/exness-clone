import { spreadFor } from "@/data/spread";

export function deriveBid(price?: number, symbol = "") {
    if (!price) return;
    const bid = price - spreadFor(symbol, price) / 2
    return bid;
}


export function deriveAsk(price?: number, symbol = "") {
    if (!price) return;
    const ask = price + spreadFor(symbol, price) / 2

    return ask;
}

// Decimals to show for a price - cheap coins need more than 2 or the
// bid/ask/spread all round to the same number (e.g. XRP ~2, DOGE ~0.2)
export function priceDecimals(price: number) {
    if (price >= 100) return 2;
    if (price >= 1) return 4;
    return 6;
}

export function formatPrice(price: number, reference = price) {
    return price.toFixed(priceDecimals(reference));
}
