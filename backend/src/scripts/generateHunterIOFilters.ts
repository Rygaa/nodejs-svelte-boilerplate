import * as dotenv from "dotenv";
import { db } from "../db";
import { hunterIOFilters } from "../db/schema";
import type { Database } from "../db";
import { generateBasicCombinations } from "../utils/generateBasicCombinations";
import { parseFiltersJsonFile } from "../../src/services/parser.service";

/**
 * Generate Hunter.io filter combinations and store them in the database
 */
export async function generateHunterIOFilters(globalTx?: any, params?: any) {
  // Use the provided transaction if available, otherwise use the default db
  const dbClient: Database = globalTx || db;

  await dbClient.delete(hunterIOFilters);

  const inputFilters = await parseFiltersJsonFile();

  // Generate filter combinations using the imported function
  const filterCombinations = generateBasicCombinations(inputFilters);

  // Get existing filters from database to check for duplicates
  const existingFilters = await dbClient.select().from(hunterIOFilters);
  const existingFilterValues = existingFilters.map((f) => JSON.stringify(f.value));

  // Insert filters into database
  let insertedCount = 0;
  let skippedCount = 0;

  for (const filterResult of filterCombinations) {
    const filterValueString = JSON.stringify(filterResult.combination);

    // Check if filter already exists
    if (existingFilterValues.includes(filterValueString)) {
      skippedCount++;
      continue;
    }

    await dbClient.insert(hunterIOFilters).values({
      value: filterResult.combination, // Use the combination object
      meta: {
        ...filterResult,
        combination: undefined,
      },
      isUsed: false,
    });

    insertedCount++;
    existingFilterValues.push(filterValueString); // Add to existing list to prevent duplicates in this batch
  }

  return {
    success: true,
    message: "Hunter.io filters generated successfully",
    totalGenerated: filterCombinations.length,
    insertedCount,
    skippedCount,
  };
}

// Export as default for easier import
export default generateHunterIOFilters;
