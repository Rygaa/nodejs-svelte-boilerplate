import { db } from "../db";
import { companies, hunterIOFilters } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { hunterRequest } from "../services/hunter.service";
import { logger } from "../services/logger.service";
import { catchErrors } from "../utils/catchErrors";

export async function discoverCompanies(
  params: { maxCombinations?: number; delayBetweenRequests?: number } = {}
): Promise<void> {
  const { delayBetweenRequests = 200 } = params;

  // get all isUsed = false hunterIOFilters
  const filters = await db.select().from(hunterIOFilters).where(eq(hunterIOFilters.isUsed, false));
  if (filters.length === 0) {
    console.log("No unused filters found. Exiting.");
    return;
  }

  console.log(`Found ${filters.length} unused filters.`);

  // Process combinations
  await filters.slice(0, 50).asyncMap(
    async (filter, index) =>
      await catchErrors(async (globalTx) => {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenRequests));

        const { country, state, city, headcount, companyType } = filter.meta as any;

        // find hungerFilterIo by value and update isUsed to true using JSON comparison
        await globalTx
          .update(hunterIOFilters)
          .set({ isUsed: true })
          .where(sql`${hunterIOFilters.value}::text = ${JSON.stringify(filter.value)}`);

        let newCompanies = 0;
        try {
          const hunterRes = await hunterRequest("/v2/discover", {
            method: "POST",
            body: filter.value,
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

          logger.success({
            message: `Processed combination ${index + 1}: ${newCompanies} new companies added (found ${
              companiesData.length
            })`,
            source: "discoverCompaniesScript",
          });
        } catch (error) {
          logger.error({
            message: `Error processing combination ${index + 1}`,
            source: "discoverCompaniesScript",
            data: { error: error instanceof Error ? error.message : "Unknown error" },
          });
        }
      })
  );

  console.log("✅ Done processing combinations");
}
