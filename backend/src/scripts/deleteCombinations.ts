import { db } from "../db";
import { combinationFilterItems, filterCombinations } from "../db/schema";
import { sql } from "drizzle-orm";
import type { Database } from "../db";

export async function deleteCombinations(tx: Database | null = null) {
  const client = tx || db;

  // Count existing records before deletion
  const [{ combinationFilterItemCount }] = await client
    .select({ combinationFilterItemCount: sql<number>`count(*)` })
    .from(combinationFilterItems);
  const [{ filterCombinationCount }] = await client
    .select({ filterCombinationCount: sql<number>`count(*)` })
    .from(filterCombinations);

  const totalCount = Number(combinationFilterItemCount) + Number(filterCombinationCount);

  if (totalCount === 0) {
    return {
      success: true,
      deletedCombinationItems: 0,
      deletedCombinations: 0,
      totalDeleted: 0,
    };
  }

  // Get counts before deletion for return values
  const combinationItemsCount = Number(combinationFilterItemCount);
  const combinationsCount = Number(filterCombinationCount);

  // Delete in proper order (child tables first)
  await client.delete(combinationFilterItems);
  await client.delete(filterCombinations);

  const totalDeleted = combinationItemsCount + combinationsCount;

  return {
    success: true,
    deletedCombinationItems: combinationItemsCount,
    deletedCombinations: combinationsCount,
    totalDeleted: totalDeleted,
  };
}

export default deleteCombinations;
