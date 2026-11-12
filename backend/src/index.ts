import app from "./app";
import "./ws/priceServer";
import "dotenv/config";
import { rebuildTriggers } from "./redis/rebuildTriggers";

// Restore Redis trigger/SL/TP sets from Postgres (e.g. after a Redis restart).
// Don't block startup on it - log and keep serving if it fails.
rebuildTriggers().catch((error) => {
  console.error("Failed to rebuild Redis triggers from Postgres:", error);
});

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  port: 3002,
  fetch: app.fetch,
};
