import { SymbolType } from "@/types/symbolType";
import "dotenv/config"

export const updateWatchlistOnServer = async (list: SymbolType[], jwtToken : string) => {
  
    const payload = list.map((item, index) => ({
    symbol: item.symbol,
    orderIndex: index + 1,
    }));
    
    // console.log("payload: " ,payload)
    // console.log("Jsonified payload: ", payload)

    await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/v1/user/watchlist`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwtToken}`,
        },
    });
};
