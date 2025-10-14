import { db } from "../db";
import { companies, combinationFilterItems, filterCombinations } from "../db/schema";
import { sql } from "drizzle-orm";
import type { Database } from "../db";

export async function deleteCompaniesAndCombinations(tx: Database | null = null) {
  try {
    const client = tx || db;

    // Count existing records before deletion
    const [{ companyCount }] = await client.select({ companyCount: sql<number>`count(*)` }).from(companies);
    const [{ combinationFilterItemCount }] = await client
      .select({ combinationFilterItemCount: sql<number>`count(*)` })
      .from(combinationFilterItems);
    const [{ filterCombinationCount }] = await client
      .select({ filterCombinationCount: sql<number>`count(*)` })
      .from(filterCombinations);

    const totalCount =
      Number(companyCount) + Number(combinationFilterItemCount) + Number(filterCombinationCount);

    if (totalCount === 0) {
      return {
        success: true,
        deletedCompanies: 0,
        deletedCombinationItems: 0,
        deletedCombinations: 0,
        totalDeleted: 0,
      };
    }

    // Get counts before deletion for return values
    const companiesCount = Number(companyCount);
    const combinationItemsCount = Number(combinationFilterItemCount);
    const combinationsCount = Number(filterCombinationCount);

    // Delete in proper order (child tables first)
    await client.delete(combinationFilterItems);
    await client.delete(filterCombinations);
    await client.delete(companies);

    const totalDeleted = companiesCount + combinationItemsCount + combinationsCount;

    return {
      success: true,
      deletedCompanies: companiesCount,
      deletedCombinationItems: combinationItemsCount,
      deletedCombinations: combinationsCount,
      totalDeleted: totalDeleted,
    };
  } catch (error) {
    throw error;
  }
}

export default deleteCompaniesAndCombinations;
