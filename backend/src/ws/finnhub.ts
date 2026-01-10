import dotenv from "dotenv";
import { set } from "./priceStore";
import { priceWatcher } from "./priceWatcher";
dotenv.config();

const FINNHUB_WS_URL = "wss://ws.finnhub.io";

let finnhubSocket: WebSocket | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function connectFinnhub(onMessage : (data: any) => void){
    if (finnhubSocket) return;

    finnhubSocket = new WebSocket(
        `${FINNHUB_WS_URL}?token=${process.env.FINNHUB_API_KEY}`);


    finnhubSocket.onopen = () => {
        console.log("Connected to Finnhub WS");
    };

    finnhubSocket.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        onMessage(msg);
        // console.log(data);

        if (msg.type !== "trade" || !Array.isArray(msg.data) || msg.data.length === 0) {
            return;
        }

        // Storing the last price of the message in the store
        const latestTrade = msg.data[msg.data.length - 1];
        set(latestTrade.s, latestTrade.p);  
        await priceWatcher(latestTrade.s, latestTrade.p);

        // for (const trade of msg.data) {
        //   set(trade.s, trade.p);  // Update last price     
        // }       
    };

    finnhubSocket.onclose = () => {
        console.log("Finnhub WS closed, reconnecting...");
        finnhubSocket = null;
        setTimeout(() => connectFinnhub(onMessage), 2000);
    }

    finnhubSocket.onerror = (err) => {
        console.error("Finnhub WS error", err);
    };

} 

export function subscribeSymbol(symbol: string) {
  finnhubSocket?.send(
    JSON.stringify({ type: "subscribe", symbol })
  );
}

export function unsubscribeSymbol(symbol: string) {
  finnhubSocket?.send(
    JSON.stringify({ type: "unsubscribe", symbol })
  );
}

