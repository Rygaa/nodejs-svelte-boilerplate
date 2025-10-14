import * as dotenv from "dotenv";
import { db } from "../db";
import { companies } from "../db/schema";
import { logger } from "../services/logger.service";

// Load environment variables from .env file
dotenv.config();

/**
 * Script to update all existing companies' state to "Quebec"
 * This is a one-time data migration script
 */
export async function updateCompaniesProvince(globalTx?: any, params?: any) {
  // Use the provided transaction if available, otherwise use the default db
  const dbClient = globalTx || db;

  try {
    logger.info({
      message: "🚀 Starting state update for all companies...",
      source: "updateCompaniesProvince",
    });

    // Get count of companies before update
    const companiesBeforeUpdate = await dbClient.select().from(companies);
    const totalCompanies = companiesBeforeUpdate.length;

    if (totalCompanies === 0) {
      logger.info({
        message: "ℹ️ No companies found in database",
        source: "updateCompaniesProvince",
      });
      return {
        success: true,
        message: "No companies to update",
        totalCompanies: 0,
        updatedCompanies: 0,
      };
    }

    logger.info({
      message: `📊 Found ${totalCompanies} companies to update`,
      source: "updateCompaniesProvince",
    });

    // Update all companies to set state to "Quebec"
    const updateResult = await dbClient
      .update(companies)
      .set({
        state: "Quebec",
        updatedAt: new Date(),
      })
      .returning({ id: companies.id, domain: companies.domain });

    const updatedCount = updateResult.length;

    logger.success({
      message: `✅ Successfully updated ${updatedCount} companies`,
      source: "updateCompaniesProvince",
    });

    logger.success({
      message: "🎯 All companies now have state set to 'Quebec'",
      source: "updateCompaniesProvince",
    });

    // Log sample of updated companies
    const sampleUpdated = updateResult.slice(0, 5);
    logger.data({
      message: "📝 Sample updated companies",
      data: {
        sample: sampleUpdated.map((c: any) => c.domain),
        showingFirst: Math.min(5, updatedCount),
        totalUpdated: updatedCount,
      },
      source: "updateCompaniesProvince",
    });

    return {
      success: true,
      message: `Successfully updated ${updatedCount} companies to state 'Quebec'`,
      totalCompanies,
      updatedCompanies: updatedCount,
    };
  } catch (error: any) {
    logger.error({
      message: "❌ Error updating companies state",
      data: error,
      source: "updateCompaniesProvince",
    });
    throw new Error(`Failed to update companies state: ${error.message}`);
  }
}

// Run the script if called directly
if (require.main === module) {
  updateCompaniesProvince()
    .then((result) => {
      console.log("\n" + "=".repeat(50));
      console.log("🎉 STATE UPDATE COMPLETED");
      console.log("=".repeat(50));
      console.log(`📊 Total companies: ${result.totalCompanies}`);
      console.log(`✅ Updated companies: ${result.updatedCompanies}`);
      console.log(`📍 State set to: Quebec`);
      console.log("=".repeat(50) + "\n");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n" + "=".repeat(50));
      console.error("❌ STATE UPDATE FAILED");
      console.error("=".repeat(50));
      console.error(error.message);
      console.error("=".repeat(50) + "\n");
      process.exit(1);
    });
}
