import { db } from "../db";
import { filters, companies, filterCombinations, combinationFilterItems } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import { hunterRequest } from "../services/hunter.service";
import type { Database } from "../db";
import { generateBasicCombinations, InputFilters } from "../utils/generateBasicCombinations";
import { logger } from "../services/logger.service";
import { catchErrors } from "../utils/catchErrors";

/**
 * Filter out used combinations and return only unused ones
 */
export async function getUnusedCombinations(
  client: Database,
  filtersToSave: Array<{ combination: any; filterIds: string[] }>
): Promise<any[]> {
  if (filtersToSave.length === 0) return [];

  const allFilterIds = [...new Set(filtersToSave.flatMap((f) => f.filterIds))];

  const existingCombinations = await client
    .select({
      combinationId: filterCombinations.id,
      filterId: combinationFilterItems.filterId,
    })
    .from(filterCombinations)
    .innerJoin(combinationFilterItems, eq(filterCombinations.id, combinationFilterItems.filterCombinationId))
    .where(inArray(combinationFilterItems.filterId, allFilterIds));

  const existingMap = new Map<string, Set<string>>();
  for (const row of existingCombinations) {
    if (!existingMap.has(row.combinationId)) {
      existingMap.set(row.combinationId, new Set());
    }
    existingMap.get(row.combinationId)!.add(row.filterId);
  }

  const arr: any[] = [];
  for (const { combination, filterIds, ...args } of filtersToSave) {
    const filterIdSet = new Set(filterIds);

    const hasExistingMatch = Array.from(existingMap.values()).some(
      (existingFilters) =>
        existingFilters.size === filterIdSet.size && [...filterIdSet].every((id) => existingFilters.has(id))
    );

    if (!hasExistingMatch) {
      arr.push({ combination, filterIds, ...args });
    }
  }

  return arr;
}

export async function discoverCompanies(
  params: { maxCombinations?: number; delayBetweenRequests?: number } = {}
): Promise<void> {
  const { maxCombinations = 10_000, delayBetweenRequests = 200 } = params;
  const allFilters = await db.select().from(filters);
  if (allFilters.length === 0) {
    console.log("❌ No filters found in database");
    return;
  }

  // --- Build InputFilters structure (fully typed) ---
  const inputFilters: InputFilters = {
    headcounts: allFilters.filter((f) => f.type === "headcount").map((f) => f.value),
    keywords: allFilters.filter((f) => f.type === "keyword").map((f) => f.value),
    industries: allFilters.filter((f) => f.type === "industry").map((f) => f.value),

    countries: (() => {
      const countryFilters = allFilters.filter((f) => f.type === "country");
      const stateFilters = allFilters.filter((f) => f.type === "state");
      const cityFilters = allFilters.filter((f) => f.type === "city");

      return countryFilters.map((country) => ({
        country: country.value,
        states: stateFilters
          .filter((state) => state.bucketName === country.value)
          .map((state) => ({
            state: state.value,
            cities: cityFilters.filter((city) => city.details === state.value).map((city) => city.value),
          })),
      }));
    })(),
  };

  const combinations = await generateBasicCombinations(inputFilters, {
    maxCombo: maxCombinations,
    ignoreNullVariations: true,
  });
  console.log(combinations[0]);
  const combinationsToProcess = await getUnusedCombinations(db, combinations);

  throw new Error("STOP - Script disabled temporarily");

  console.log(`Unused combinations: ${combinationsToProcess.length}`);
  if (combinationsToProcess.length === 0) {
    console.log("No new combinations to process");
    return;
  }

  // Process combinations
  await combinationsToProcess.slice(0, 50).asyncMap(
    async ({ filterIds, combination, country, state, city, headcount, companyType }, index) =>
      await catchErrors(async (globalTx) => {
        if (filterIds.length === 0) return;

        const combinationName = `Discovery Combo ${index + 1} - ${new Date().toISOString()}`;

        const [newCombination] = await globalTx
          .insert(filterCombinations)
          .values({ name: combinationName })
          .returning({ id: filterCombinations.id });

        if (filterIds.length > 0) {
          await globalTx.insert(combinationFilterItems).values(
            filterIds.map((filterId: string) => ({
              filterId,
              filterCombinationId: newCombination.id,
            }))
          );
        }

        await new Promise((r) => setTimeout(r, delayBetweenRequests));

        let newCompanies = 0;
        try {
          const hunterRes = await hunterRequest("/v2/discover", {
            method: "POST",
            body: combination,
          });

          const companiesData: any[] = hunterRes?.data || [];
          if (companiesData.length > 0) {
            for (const companyData of companiesData) {
              if (!companyData.domain) continue;

              const existingCompany = await globalTx
                .select({ id: companies.id })
                .from(companies)
                .where(eq(companies.domain, companyData.domain))
                .limit(1);

              if (existingCompany.length === 0) {
                await globalTx.insert(companies).values({
                  domain: companyData.domain,
                  organization: companyData.organization || companyData.name || null,
                  industry: companyData.industry || null,
                  country: country || null,
                  state: state || null,
                  city: city || null,
                  headcount: headcount || null,
                  companyType,
                  yearFounded: companyData.year_founded || companyData.founded || null,
                });
                newCompanies++;
              }
            }
          }

          console.log(
            `Processed combination ${index + 1}: ${newCompanies} new companies added found ${
              companiesData.length
            }`
          );
          logger.success({
            message: `Processed combination ${index + 1}: ${newCompanies} new companies added (found ${
              companiesData.length
            })`,
            source: "discoverCompaniesScript",
            data: combination,
          });
        } catch (error) {
          console.log(`Error processing combination ${index + 1}:`);
          logger.error({
            message: `Error processing combination ${index + 1}`,
            source: "discoverCompaniesScript",
            data: { error: error instanceof Error ? error.message : "Unknown error", combination },
          });
        }
      })
  );

  console.log("✅ Done processing combinations");
}
