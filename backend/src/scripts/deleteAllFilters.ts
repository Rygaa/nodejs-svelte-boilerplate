import { db } from "../db";
import { filters } from "../db/schema";
import { sql } from "drizzle-orm";
import type { Database } from "../db";

export async function deleteAllFilters(tx: Database | null = null) {
  try {
    const client = tx || db;

    // Count existing filters before deletion
    const [{ count }] = await client.select({ count: sql<number>`count(*)` }).from(filters);
    const existingCount = Number(count);

    if (existingCount === 0) {
      return { success: true, deleted: 0 };
    }

    // Delete all filters
    const result = await client.delete(filters);

    return { success: true, deleted: existingCount };
  } catch (error) {
    throw error;
  }
}

export default deleteAllFilters;
