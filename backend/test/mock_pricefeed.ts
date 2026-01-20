import { priceWatcher } from "../src/ws/priceWatcher";

export let price = 46500;

setInterval(async () => {
  price -= 50;
  await priceWatcher("BINANCE:ETHUSDT", price);
  console.log("price:", price);
}, 1000);
