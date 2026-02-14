

const spread =  0.0002

export function deriveBid(price?: number) {
    if (!price) return;
    const bid = price - spread / 2
    return bid;
}


export function deriveAsk(price?: number) {
    if (!price) return;
    const ask = price + spread / 2

    return ask;
}

