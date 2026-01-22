export function checker(side: string, stopLoss: number, takeProfit: number, price: number): string | null {
    if (side === "buy") {
        if (stopLoss && price <= stopLoss) {
            return "Stop loss must be less than current price in buy order";
        }
        if (takeProfit && price >= takeProfit) {
            return "Take profit must be greater than current price in buy order";
        }
    } else {
        if (stopLoss && price >= stopLoss) {
            return "Stop loss must be greater than current price in sell order";
        }
        if (takeProfit && price <= takeProfit) {
            return "Take profit must be less than current price in sell order";
        }
    }
    return null; // No errors
}