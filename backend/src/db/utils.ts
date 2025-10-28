import { getDatabase } from "./index";
import { PgTransaction } from "drizzle-orm/pg-core";
import { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "./schema";

const db = getDatabase();

export type DbTransaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type DbTransactionOrDB = DbTransaction | typeof db;

export async function withTransaction<T>(callback: (tx: DbTransaction) => Promise<T>): Promise<T> {
  return await db.transaction(callback);
}

export { db };
