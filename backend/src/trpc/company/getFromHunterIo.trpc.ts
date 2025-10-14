import { z } from "zod";
import { protectedProcedure } from "../../index";
import { TRPCError } from "@trpc/server";
import { hunterRequest } from "../../services/hunter.service";
import { db } from "../../db";
import { companies, users, emailsCounts } from "../../db/schema";
import { eq, count } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";
// Import asyncMap from shared package to get global declarations

// Simple filters fallback function
async function loadFiltersFromDatabase() {
  return {
    headcounts: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"],
    company_types: ["private", "public", "nonprofit"],
    keyword_buckets: [
      ["technology", "software"],
      ["finance", "banking"],
      ["healthcare", "medical"],
    ],
  };
}

// Types based on the run controller
export interface FilterCombinations {
  headcount: any;
  companyType: any;
  keywords: any;
  location: any;
}

export interface HunterApiBody {
  headquarters_location?: any;
  headcount?: any[];
  company_type?: { include: any[] };
  keywords?: { match: string; include: any[] };
}

export interface ApiHunterDiscoverResponse {
  domain: string;
  organization: string;
  emails_count?: {
    personal: number;
    generic: number;
    total: number;
  };
}

// Helper function to generate combinations (ported from run.controller.ts)
export function generateCombinations(filters: {
  headcounts: string[];
  company_types: string[];
  keyword_buckets: string[] | string[][];
  location?: any;
}): HunterApiBody[] {
  const result: HunterApiBody[] = [];

  // Normalize location
  let normalizedLocation: { headquarters_location: { include: any[] } } | undefined = undefined;
  if (filters.location) {
    if (Array.isArray(filters.location)) {
      normalizedLocation = { headquarters_location: { include: filters.location } };
    } else if (filters.location.headquarters_location?.include) {
      normalizedLocation = filters.location;
    }
  }

  for (const headcount of filters.headcounts) {
    for (const companyType of filters.company_types) {
      for (const keywords of filters.keyword_buckets) {
        const combo: HunterApiBody = {};

        if (normalizedLocation) {
          combo.headquarters_location = normalizedLocation.headquarters_location;
        }

        if (headcount) {
          combo.headcount = [headcount]; // API expects array
        }

        if (companyType) {
          combo.company_type = { include: [companyType] };
        }

        if (keywords) {
          combo.keywords = {
            match: "any",
            include: Array.isArray(keywords) ? keywords : [keywords],
          };
        }

        result.push(combo);
      }
    }
  }

  return result;
}

// Input schema for the discovery endpoint
const DiscoveryInputSchema = z.object({
  maxCombos: z.number().min(1).max(100).optional().default(10),
  selectedFilters: z
    .object({
      headcounts: z.array(z.string()).optional(),
      company_types: z.array(z.string()).optional(),
      keyword_buckets: z.array(z.union([z.string(), z.array(z.string())])).optional(),
      location: z.any().optional(),
      country: z.array(z.string()).optional(),
    })
    .optional(),
});

// Discover companies from Hunter.io API
export const getFromHunterIo = protectedProcedure
  .input(DiscoveryInputSchema)
  .mutation(async ({ ctx, input }) => {
    return await catchErrors(async (globalTx) => {
      // Only ROOT users can access this endpoint
      const [user] = await globalTx.select().from(users).where(eq(users.id, ctx.user!.userId));

      if (!user || user.role !== "ROOT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only ROOT users can discover companies",
        });
      }

      const { maxCombos, selectedFilters } = input;

      // Check Hunter API health
      const healthCheck = await hunterRequest("/v2/account");
      if (!healthCheck?.data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Hunter API health check failed",
        });
      }

      // Load all available filters from database as fallbacks
      const allFilters = await loadFiltersFromDatabase();

      // If no filters are selected at all, return early
      if (
        !selectedFilters ||
        (!selectedFilters.headcounts?.length &&
          !selectedFilters.company_types?.length &&
          !selectedFilters.keyword_buckets?.length &&
          !selectedFilters.location &&
          !selectedFilters.country?.length)
      ) {
        const [totalResult] = await globalTx.select({ count: count() }).from(companies);
        const totalCompanies = totalResult.count;
        return {
          message: "No filters selected - nothing to discover",
          apiCalls: 0,
          newCompanies: 0,
          totalCompanies,
        };
      }

      const finalFilters = {
        headcounts: selectedFilters?.headcounts?.length ? selectedFilters.headcounts : allFilters.headcounts,
        company_types: selectedFilters?.company_types?.length
          ? selectedFilters.company_types
          : allFilters.company_types,
        keyword_buckets: (selectedFilters?.keyword_buckets?.length
          ? selectedFilters.keyword_buckets
          : allFilters.keyword_buckets) as string[] | string[][],
        location: selectedFilters?.location || undefined, // Only use selected location, no fallback
      };

      const combinations = generateCombinations(finalFilters);

      let calls = 0;
      let newCompanies = 0;

      // Process combinations (limited by maxCombos)
      const limitedCombinations = combinations.slice(0, maxCombos);

      await limitedCombinations.asyncMap(async (body: HunterApiBody, idx: number) => {
        const hunterRes = await hunterRequest("/v2/discover", { method: "POST", body });
        const data = hunterRes.data || [];
        calls++;

        await data.asyncMap(async (company: ApiHunterDiscoverResponse) => {
          if (!company.domain) return;

          const [exists] = await globalTx
            .select()
            .from(companies)
            .where(eq(companies.domain, company.domain))
            .limit(1);

          // Also check if there are existing email counts
          let existingEmailCount = null;
          if (exists) {
            const [emailCount] = await globalTx
              .select()
              .from(emailsCounts)
              .where(eq(emailsCounts.companyId, exists.id))
              .limit(1);
            existingEmailCount = emailCount;
          }

          if (!exists) {
            // Extract location information from the request body
            const bodyAny = body as any;
            let city: string | null = null;
            let country: string | null = null;

            // Primary: extract from headquarters_location.include[0]
            try {
              const hq = bodyAny?.headquarters_location?.include?.[0];
              if (hq) {
                city = hq.city || hq.name || null;
                country = hq.country || hq.code || null;
              }
            } catch (err) {
              // ignore and fall back
            }

            // Fallback: keep previous location parsing if HQ not provided
            if (!city && bodyAny.location) {
              if (typeof bodyAny.location === "string") {
                const parts = (bodyAny.location as string)
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean);
                if (parts.length === 1) {
                  city = parts[0];
                } else if (parts.length >= 2) {
                  country = parts[parts.length - 1];
                  city = parts.slice(0, parts.length - 1).join(", ");
                }
              } else if (typeof bodyAny.location === "object") {
                city = bodyAny.location.city || city;
                country = bodyAny.location.country || country;
              }
            }

            const [newCompany] = await globalTx
              .insert(companies)
              .values({
                domain: company.domain,
                organization: company.organization,
                city,
                country,
              })
              .returning();

            if (company.emails_count) {
              await globalTx.insert(emailsCounts).values({
                companyId: newCompany.id,
                personal: company.emails_count.personal || 0,
                generic: company.emails_count.generic || 0,
                total: company.emails_count.total || 0,
              });
            }

            newCompanies++;
          } else if (company.emails_count && !existingEmailCount) {
            await globalTx.insert(emailsCounts).values({
              companyId: exists.id,
              personal: company.emails_count.personal || 0,
              generic: company.emails_count.generic || 0,
              total: company.emails_count.total || 0,
            });
          }
        });
      });

      const [finalCountResult] = await globalTx.select({ count: count() }).from(companies);
      const finalCount = finalCountResult.count;

      return {
        message: "Discovery completed successfully",
        apiCalls: calls,
        newCompanies,
        totalCompanies: finalCount,
        combinationsProcessed: limitedCombinations.length,
      };
    });
  });
