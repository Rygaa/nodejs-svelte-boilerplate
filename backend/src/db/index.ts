import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import "dotenv/config";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

// Lazy initialization function for database connection
function createDatabaseConnection() {
  // Parse the DATABASE_URL to ensure proper configuration
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required. Please check your .env file.");
  }

  // Parse the URL to extract individual components
  const url = new URL(databaseUrl);

  const pool = new Pool({
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1), // Remove leading slash
    user: url.username,
    password: url.password, // Ensure this is explicitly a string
    // Ensure SSL is disabled for local development
    ssl: false,
    // Explicitly set connection parameters
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  return drizzle(pool, { schema });
}

// Export a getter function instead of immediate initialization
export const getDatabase = (): ReturnType<typeof createDatabaseConnection> => {
  if (!dbInstance) {
    dbInstance = createDatabaseConnection();
  }
  return dbInstance;
};

// For backwards compatibility - this will only initialize when first accessed
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = getDatabase();
    return (database as any)[prop];
  },
});

export type Database = ReturnType<typeof getDatabase>;
