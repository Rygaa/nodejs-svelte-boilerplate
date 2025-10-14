import * as dotenv from "dotenv";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../services/logger.service";

// Load environment variables from .env file
dotenv.config();

/**
 * Script to standardize database timezone to UTC
 * This fixes timezone mismatches between Node.js and PostgreSQL
 */
export async function standardizeTimezoneToUTC(globalTx?: any, params?: any) {
  // Use the provided transaction if available, otherwise use the default db
  const dbClient = globalTx || db;

  try {
    logger.info({
      message: "🌍 Starting timezone standardization to UTC...",
      source: "standardizeTimezoneToUTC",
    });

    // Check current timezone
    const currentTimezoneResult = await dbClient.execute(sql`SELECT current_setting('TIMEZONE') as timezone`);
    const currentTimezone = currentTimezoneResult.rows[0]?.timezone;

    logger.info({
      message: `📍 Current database timezone: ${currentTimezone}`,
      source: "standardizeTimezoneToUTC",
    });

    if (currentTimezone === "UTC") {
      logger.info({
        message: "✅ Database is already set to UTC timezone",
        source: "standardizeTimezoneToUTC",
      });
      return {
        success: true,
        message: "Database timezone already set to UTC",
        previousTimezone: currentTimezone,
        newTimezone: "UTC",
      };
    }

    // Get current timestamp before change
    const beforeResult = await dbClient.execute(
      sql`SELECT NOW() as current_time, CURRENT_TIMESTAMP as current_ts`
    );

    logger.info({
      message: `⏰ Current database time: ${beforeResult.rows[0]?.current_time}`,
      source: "standardizeTimezoneToUTC",
    });

    // Set the database timezone to UTC for this session
    await dbClient.execute(sql`SET timezone = 'UTC'`);

    // Make the change persistent for the database (requires superuser privileges)
    try {
      await dbClient.execute(sql`ALTER DATABASE oasis_path_db SET timezone = 'UTC'`);
      logger.success({
        message: "✅ Database timezone permanently set to UTC",
        source: "standardizeTimezoneToUTC",
      });
    } catch (alterError: any) {
      logger.warning({
        message: "⚠️ Could not set permanent timezone (requires superuser), but session timezone is set",
        data: alterError.message,
        source: "standardizeTimezoneToUTC",
      });
    }

    // Verify the change
    const newTimezoneResult = await dbClient.execute(sql`SELECT current_setting('TIMEZONE') as timezone`);
    const newTimezone = newTimezoneResult.rows[0]?.timezone;

    // Get current timestamp after change
    const afterResult = await dbClient.execute(
      sql`SELECT NOW() as current_time, CURRENT_TIMESTAMP as current_ts`
    );

    logger.success({
      message: `🎯 Database timezone changed from ${currentTimezone} to ${newTimezone}`,
      source: "standardizeTimezoneToUTC",
    });

    logger.info({
      message: `🕐 New database time: ${afterResult.rows[0]?.current_time}`,
      source: "standardizeTimezoneToUTC",
    });

    // Show Node.js timezone for comparison
    const nodeTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nodeTime = new Date().toISOString();

    logger.info({
      message: `💻 Node.js timezone: ${nodeTimezone}, time: ${nodeTime}`,
      source: "standardizeTimezoneToUTC",
    });

    return {
      success: true,
      message: `Successfully changed database timezone from ${currentTimezone} to UTC`,
      previousTimezone: currentTimezone,
      newTimezone: newTimezone,
      previousTime: beforeResult.rows[0]?.current_time,
      newTime: afterResult.rows[0]?.current_time,
      nodeTimezone: nodeTimezone,
      nodeTime: nodeTime,
    };
  } catch (error: any) {
    logger.error({
      message: "❌ Error standardizing timezone to UTC",
      data: error,
      source: "standardizeTimezoneToUTC",
    });
    throw new Error(`Failed to standardize timezone to UTC: ${error.message}`);
  }
}

// Export as default for easier import
export default standardizeTimezoneToUTC;

// Allow script to be run directly
if (require.main === module) {
  standardizeTimezoneToUTC()
    .then((result) => {
      console.log("\n" + "=".repeat(60));
      console.log("🌍 TIMEZONE STANDARDIZATION COMPLETED");
      console.log("=".repeat(60));
      console.log(`📍 Previous timezone: ${result.previousTimezone}`);
      console.log(`🎯 New timezone: ${result.newTimezone}`);
      console.log(`⏰ Previous time: ${result.previousTime}`);
      console.log(`🕐 New time: ${result.newTime}`);
      console.log(`💻 Node.js timezone: ${result.nodeTimezone}`);
      console.log(`💻 Node.js time: ${result.nodeTime}`);
      console.log("=".repeat(60));
      console.log("✅ All timestamps will now be consistent in UTC");
      console.log("=".repeat(60) + "\n");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n" + "=".repeat(60));
      console.error("❌ TIMEZONE STANDARDIZATION FAILED");
      console.error("=".repeat(60));
      console.error(error.message);
      console.error("=".repeat(60) + "\n");
      process.exit(1);
    });
}
