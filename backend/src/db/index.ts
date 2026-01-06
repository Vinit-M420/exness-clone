// Old Neon-http severless approach //
// import { drizzle } from "drizzle-orm/neon-http"
// import { neon } from "@neondatabase/serverless"
// import * as schema from "./schema"
// const neonClient = neon(process.env.DATABASE_URL!)
// export const db = drizzle(neonClient, { schema });

// New Neon-http serverless approach
import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "./schema"
import ws from 'ws';

// Enable WebSocket support
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });