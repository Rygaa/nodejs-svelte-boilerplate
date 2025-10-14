import { z } from "zod";
import { protectedProcedure } from "../../index";
import { db } from "../../db";
import { filters } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

const getFiltersSchema = z.object({
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
  type: z.string().optional(),
});

export const getFilters = protectedProcedure.input(getFiltersSchema).query(async ({ input, ctx }) => {
  return await catchErrors(async (globalTx) => {
    const { limit, offset, type } = input;

    // Build where clause
    let whereClause = undefined;
    if (type) {
      whereClause = eq(filters.type, type);
    }

    // Get filters with pagination
    const allFilters = await globalTx
      .select({
        id: filters.id,
        type: filters.type,
        value: filters.value,
        bucketName: filters.bucketName,
        details: filters.details,
        createdAt: filters.createdAt,
      })
      .from(filters)
      .where(whereClause)
      .orderBy(desc(filters.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      filters: allFilters,
      meta: {
        total: allFilters.length,
        limit,
        offset,
      },
    };
  });
});
