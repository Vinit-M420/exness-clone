import app from "./app";
import "./ws/priceServer";

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  port: 3000,
  fetch: app.fetch,
  // websocket: app.priceServer, 
};

