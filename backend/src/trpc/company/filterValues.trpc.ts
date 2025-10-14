import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../index";
import { db } from "../../db";
import { companies, users } from "../../db/schema";
import { eq, isNotNull, count } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

// Input schema for getting filter values
const getFilterValuesInputSchema = z.object({
  columns: z.array(z.string()).optional(), // Specific columns to get values for, if not provided get all
});

// Get distinct values for each column to use as filter options
export const getFilterValues = protectedProcedure
  .input(getFilterValuesInputSchema)
  .query(async ({ ctx, input }) => {
    return await catchErrors(async (globalTx) => {
      // Only ROOT and ADMIN users can get filter values
      const [user] = await globalTx.select().from(users).where(eq(users.id, ctx.user!.userId));

      if (!user || !["ROOT", "ADMIN"].includes(user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only ROOT and ADMIN users can get filter values",
        });
      }

      const { columns } = input;

      const filterValues: Record<string, string[]> = {};

      // Get distinct values for common filterable columns
      const commonColumns = [
        "organization",
        "domain",
        "industry",
        "country",
        "state",
        "city",
        "headcount",
        "companyType",
      ];
      const columnsToProcess = columns || commonColumns;

      for (const columnName of columnsToProcess) {
        if (columnName === "organization") {
          const results = await globalTx
            .selectDistinct({ value: companies.organization })
            .from(companies)
            .where(isNotNull(companies.organization));
          filterValues[columnName] = results
            .map((r) => r.value)
            .filter((val): val is string => Boolean(val))
            .sort();
        } else if (columnName === "domain") {
          const results = await globalTx
            .selectDistinct({ value: companies.domain })
            .from(companies)
            .where(isNotNull(companies.domain));
          filterValues[columnName] = results
            .map((r) => r.value)
            .filter((val): val is string => Boolean(val))
            .sort();
        } else if (columnName === "industry") {
          const results = await globalTx
            .selectDistinct({ value: companies.industry })
            .from(companies)
            .where(isNotNull(companies.industry));
          filterValues[columnName] = results
            .map((r) => r.value)
            .filter((val): val is string => Boolean(val))
            .sort();
        } else if (columnName === "country") {
          const results = await globalTx
            .selectDistinct({ value: companies.country })
            .from(companies)
            .where(isNotNull(companies.country));
          filterValues[columnName] = results
            .map((r) => r.value)
            .filter((val): val is string => Boolean(val))
            .sort();
        } else if (columnName === "state") {
          const results = await globalTx
            .selectDistinct({ value: companies.state })
            .from(companies)
            .where(isNotNull(companies.state));
          filterValues[columnName] = results
            .map((r) => r.value)
            .filter((val): val is string => Boolean(val))
            .sort();
        } else if (columnName === "city") {
          const results = await globalTx
            .selectDistinct({ value: companies.city })
            .from(companies)
            .where(isNotNull(companies.city));
          filterValues[columnName] = results
            .map((r) => r.value)
            .filter((val): val is string => Boolean(val))
            .sort();
        } else if (columnName === "headcount") {
          const results = await globalTx
            .selectDistinct({ value: companies.headcount })
            .from(companies)
            .where(isNotNull(companies.headcount));
          filterValues[columnName] = results
            .map((r) => r.value)
            .filter((val): val is string => Boolean(val))
            .sort();
        } else if (columnName === "companyType") {
          const results = await globalTx
            .selectDistinct({ value: companies.companyType })
            .from(companies)
            .where(isNotNull(companies.companyType));
          filterValues[columnName] = results
            .map((r) => r.value)
            .filter((val): val is string => Boolean(val))
            .sort();
        }
      }

      // Get total company count for meta info
      const [countResult] = await globalTx.select({ count: count() }).from(companies);

      return {
        filterValues,
        meta: {
          totalCompanies: countResult.count,
          columnsProcessed: columnsToProcess,
        },
      };
    });
  });
