import { db } from "../db";
import { hunterIOFilters } from "../db/schema";
import { sql } from "drizzle-orm";
import type { Database } from "../db";

export async function deleteHunterIOFilters(tx: Database | null = null) {
  const client = tx || db;

  // Count existing records before deletion
  const [{ hunterIOFilterCount }] = await client
    .select({ hunterIOFilterCount: sql<number>`count(*)` })
    .from(hunterIOFilters);

  const totalCount = Number(hunterIOFilterCount);

  if (totalCount === 0) {
    return {
      success: true,
      deletedFilters: 0,
      totalDeleted: 0,
    };
  }

  // Get count before deletion for return value
  const filtersCount = Number(hunterIOFilterCount);

  // Delete all Hunter.io filters
  await client.delete(hunterIOFilters);

  return {
    success: true,
    deletedFilters: filtersCount,
    totalDeleted: filtersCount,
  };
}

export default deleteHunterIOFilters;
