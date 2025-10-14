import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../index";
import { db } from "../../db";
import { companies, users, companyEmails, emailsCounts } from "../../db/schema";
import { eq, and, or, ilike, count, desc, asc, isNotNull, ne, gte } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

// Input schema for listing companies
const listCompaniesInputSchema = z.object({
  pagination: z.object({
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
  }),
  search: z.string().optional(),
  filters: z.record(z.string(), z.array(z.string())).optional(), // Dynamic filters object from DataGrid
});

// Get companies with pagination and filtering
export const listCompanies = protectedProcedure
  .input(listCompaniesInputSchema)
  .query(async ({ ctx, input }) => {
    return await catchErrors(async (globalTx) => {
      // Only ROOT and ADMIN users can list companies
      const [user] = await globalTx.select().from(users).where(eq(users.id, ctx.user!.userId));

      if (!user || !["ROOT", "ADMIN"].includes(user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only ROOT and ADMIN users can list companies",
        });
      }

      const { pagination, search, filters } = input;
      const { limit, offset } = pagination;

      // Build where conditions
      const whereConditions = [];

      if (search) {
        whereConditions.push(
          or(
            ilike(companies.organization, `%${search}%`),
            ilike(companies.domain, `%${search}%`),
            ilike(companies.city, `%${search}%`)
          )
        );
      }

      // Handle dynamic filters from DataGrid
      if (filters) {
        Object.entries(filters).forEach(([columnName, values]) => {
          if (values && values.length > 0) {
            // Map column names if needed
            const fieldMap: Record<string, any> = {
              organization: companies.organization,
              domain: companies.domain,
              industry: companies.industry,
              country: companies.country,
              state: companies.state,
              city: companies.city,
              headcount: companies.headcount,
              companyType: companies.companyType,
            };

            const field = fieldMap[columnName];
            if (field) {
              whereConditions.push(or(...values.map((value) => ilike(field, `%${value}%`))));
            }
          }
        });
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get companies with email counts - using a separate query for simplicity
      const companiesResult = await globalTx
        .select({
          id: companies.id,
          domain: companies.domain,
          organization: companies.organization,
          industry: companies.industry,
          country: companies.country,
          state: companies.state,
          city: companies.city,
          headcount: companies.headcount,
          companyType: companies.companyType,
          yearFounded: companies.yearFounded,
          personalization: companies.personalization,
          personalizationDone: companies.personalizationDone,
          personalizedAt: companies.personalizedAt,
          createdAt: companies.createdAt,
          updatedAt: companies.updatedAt,
        })
        .from(companies)
        .where(whereClause)
        .orderBy(desc(companies.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [totalResult] = await globalTx.select({ count: count() }).from(companies).where(whereClause);

      const total = totalResult.count;

      // Get email counts for each company (simplified - just count)
      const companiesWithCounts = await Promise.all(
        companiesResult.map(async (company) => {
          const [emailCount] = await globalTx
            .select({ count: count() })
            .from(companyEmails)
            .where(eq(companyEmails.companyId, company.id));

          return {
            ...company,
            _count: {
              emails: emailCount.count,
            },
          };
        })
      );

      return {
        companies: companiesWithCounts,
        meta: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    });
  });

// Get company statistics
export const getCompanyStats = protectedProcedure.query(async ({ ctx }) => {
  return await catchErrors(async (globalTx) => {
    // Only ROOT and ADMIN users can view stats
    const [user] = await globalTx.select().from(users).where(eq(users.id, ctx.user!.userId));

    if (!user || !["ROOT", "ADMIN"].includes(user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only ROOT and ADMIN users can view company statistics",
      });
    }

    // Get total company count
    const [totalCompaniesResult] = await globalTx.select({ count: count() }).from(companies);

    // Get companies with email data (simplified - companies that have any emails)
    const companiesWithEmailsResult = await globalTx
      .select({ companyId: companyEmails.companyId })
      .from(companyEmails)
      .groupBy(companyEmails.companyId);

    // Get unique countries
    const countriesResult = await globalTx
      .selectDistinct({ country: companies.country })
      .from(companies)
      .where(and(isNotNull(companies.country), ne(companies.country, "")));

    // Get unique industries
    const industriesResult = await globalTx
      .selectDistinct({ industry: companies.industry })
      .from(companies)
      .where(and(isNotNull(companies.industry), ne(companies.industry, "")));

    // Get recent companies (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentCompaniesResult] = await globalTx
      .select({ count: count() })
      .from(companies)
      .where(gte(companies.createdAt, thirtyDaysAgo));

    // Get companies added in the last hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const [lastHourResult] = await globalTx
      .select({ count: count() })
      .from(companies)
      .where(gte(companies.createdAt, oneHourAgo));

    // Get companies added in the last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);

    const [last24HoursResult] = await globalTx
      .select({ count: count() })
      .from(companies)
      .where(gte(companies.createdAt, twentyFourHoursAgo));

    return {
      totalCompanies: totalCompaniesResult.count,
      companiesWithEmails: companiesWithEmailsResult.length,
      uniqueCountries: countriesResult.length,
      uniqueIndustries: industriesResult.length,
      recentCompanies: recentCompaniesResult.count,
      countries: countriesResult.map((c) => c.country).filter(Boolean),
      industries: industriesResult.map((i) => i.industry).filter(Boolean),
      // New time-based statistics
      stats: {
        lastHour: lastHourResult.count,
        last24Hours: last24HoursResult.count,
        total: totalCompaniesResult.count,
      },
    };
  });
});
