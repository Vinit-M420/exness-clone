import { priceWatcher } from "../src/ws/priceWatcher";

export let price = 44100;

setInterval(async () => {
  price += 50;
  await priceWatcher("BINANCE:SOLUSDT", price);
  console.log("price:", price);
}, 1000);
