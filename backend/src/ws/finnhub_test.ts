import dotenv from "dotenv";
dotenv.config();


const ws = new WebSocket(
  `wss://ws.finnhub.io?token=${process.env.FINNHUB_API_KEY}`
);

ws.onopen = () => {
  console.log("🟢 OPEN");
  ws.send(JSON.stringify({
    type: "subscribe",
    symbol: "BINANCE:BTCUSDT"
  }));
};

ws.onmessage = (e) => {
  console.log("📩 MSG:", e.data);
};

ws.onerror = (e) => {
  console.log("❌ ERROR:", e);
};

ws.onclose = () => {
  console.log("🔴 CLOSED");
};
