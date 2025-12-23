import dotenv from "dotenv";
dotenv.config();

const FINNHUB_WS_URL = "wss://ws.finnhub.io";

let finnhubSocket: WebSocket | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function connectFinnhub(onMessage : (data: any) => void){
    if (finnhubSocket) return;

    finnhubSocket = new WebSocket(
        `${FINNHUB_WS_URL}?token=${process.env.FINNHUB_API_KEY}`);


    finnhubSocket.onopen = () => {
        console.log("Connected to Finnhub WS");
    };

    finnhubSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        onMessage(data);
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
