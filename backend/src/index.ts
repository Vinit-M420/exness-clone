import app from "./app";
import "./ws/priceServer";
import "dotenv/config";

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  port: 3002,
  fetch: app.fetch,
};

