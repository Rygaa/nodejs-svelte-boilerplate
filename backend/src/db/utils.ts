import { db } from "./index";
import { PgTransaction } from "drizzle-orm/pg-core";

// Type for transaction
export type DbTransaction = PgTransaction<any, any, any>;

// Helper function to run operations in a transaction
export async function withTransaction<T>(callback: (tx: DbTransaction) => Promise<T>): Promise<T> {
  return await db.transaction(callback);
}

// Export the database instance
export { db };
