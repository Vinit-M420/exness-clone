import { RedisClient } from "bun";

const redisClient = new RedisClient(
  "redis://localhost:6379"
);

await redisClient.set("ping", "pong");
const res = await redisClient.get("ping");

console.log(res); 