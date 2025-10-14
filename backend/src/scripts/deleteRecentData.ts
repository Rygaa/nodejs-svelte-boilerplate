import * as dotenv from "dotenv";
import { db } from "../db";
import { companies, combinationFilterItems, filterCombinations } from "../db/schema";
import { sql, gte } from "drizzle-orm";
import { logger } from "../services/logger.service";
import type { Database } from "../db";

// Load environment variables from .env file
dotenv.config();

/**
 * Script to delete companies and combination filters created in the last 12 hours
 * This script removes recent data that might be test data or unwanted entries
 */
export async function deleteRecentData(globalTx?: any, params?: any) {
  // Use the provided transaction if available, otherwise use the default db
  const dbClient: Database = globalTx || db;

  try {
    logger.info({
      message: "🚀 Starting deletion of recent companies and combination filters...",
      source: "deleteRecentData",
    });

    // Calculate the cutoff time (12 hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 12);

    logger.info({
      message: `⏰ Deleting data created after: ${cutoffTime.toISOString()}`,
      source: "deleteRecentData",
    });

    // Count companies created in the last 12 hours
    const [{ recentCompaniesCount }] = await dbClient
      .select({ recentCompaniesCount: sql<number>`count(*)` })
      .from(companies)
      .where(gte(companies.createdAt, cutoffTime));

    // Count filter combinations created in the last 12 hours
    const [{ recentCombinationsCount }] = await dbClient
      .select({ recentCombinationsCount: sql<number>`count(*)` })
      .from(filterCombinations)
      .where(gte(filterCombinations.createdAt, cutoffTime));

    // Count combination filter items that belong to recent filter combinations
    // We'll use a subquery to avoid parameter limits with large arrays
    const [{ recentCombinationItemsCount }] = await dbClient
      .select({ recentCombinationItemsCount: sql<number>`count(*)` })
      .from(combinationFilterItems).where(sql`${combinationFilterItems.filterCombinationId} IN (
        SELECT id FROM ${filterCombinations} 
        WHERE ${filterCombinations.createdAt} >= ${cutoffTime}
      )`);

    const companiesCount = Number(recentCompaniesCount);
    const combinationsCount = Number(recentCombinationsCount);
    const combinationItemsCount = Number(recentCombinationItemsCount);

    const totalToDelete = companiesCount + combinationsCount + combinationItemsCount;

    if (totalToDelete === 0) {
      logger.info({
        message: "ℹ️ No recent data found to delete",
        source: "deleteRecentData",
      });
      return {
        success: true,
        message: "No recent data to delete",
        deletedCompanies: 0,
        deletedCombinations: 0,
        deletedCombinationItems: 0,
        totalDeleted: 0,
      };
    }

    logger.info({
      message: `📊 Found data to delete - Companies: ${companiesCount}, Combinations: ${combinationsCount}, Combination Items: ${combinationItemsCount}`,
      source: "deleteRecentData",
    });

    // Delete recent combination filter items first (child records)
    // Use subquery to avoid parameter limits
    let deletedCombinationItems = 0;
    if (combinationItemsCount > 0) {
      const deleteItemsResult = await dbClient.delete(combinationFilterItems)
        .where(sql`${combinationFilterItems.filterCombinationId} IN (
          SELECT id FROM ${filterCombinations} 
          WHERE ${filterCombinations.createdAt} >= ${cutoffTime}
        )`);
      deletedCombinationItems = combinationItemsCount;
    }

    // Delete recent filter combinations
    const deleteCombinationsResult = await dbClient
      .delete(filterCombinations)
      .where(gte(filterCombinations.createdAt, cutoffTime));

    // Delete recent companies
    const deleteCompaniesResult = await dbClient
      .delete(companies)
      .where(gte(companies.createdAt, cutoffTime));

    const totalDeleted = companiesCount + combinationsCount + deletedCombinationItems;

    logger.success({
      message: `✅ Successfully deleted recent data - Companies: ${companiesCount}, Combinations: ${combinationsCount}, Combination Items: ${deletedCombinationItems}`,
      source: "deleteRecentData",
    });

    logger.info({
      message: `🎯 Total records deleted: ${totalDeleted}`,
      source: "deleteRecentData",
    });

    return {
      success: true,
      message: "Recent data deleted successfully",
      deletedCompanies: companiesCount,
      deletedCombinations: combinationsCount,
      deletedCombinationItems: deletedCombinationItems,
      totalDeleted: totalDeleted,
    };
  } catch (error: any) {
    logger.error({
      message: "❌ Error deleting recent data",
      data: error,
      source: "deleteRecentData",
    });
    throw new Error(`Failed to delete recent data: ${error.message}`);
  }
}

// Export as default for easier import
export default deleteRecentData;

// Allow script to be run directly
if (require.main === module) {
  deleteRecentData()
    .then((result) => {
      console.log("🎉 RECENT DATA DELETION COMPLETED");
      console.log(`✅ Success: ${result.success}`);
      console.log(`📊 Companies deleted: ${result.deletedCompanies}`);
      console.log(`📊 Combinations deleted: ${result.deletedCombinations}`);
      console.log(`📊 Combination items deleted: ${result.deletedCombinationItems}`);
      console.log(`📊 Total deleted: ${result.totalDeleted}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ RECENT DATA DELETION FAILED");
      console.error(error);
      process.exit(1);
    });
}
