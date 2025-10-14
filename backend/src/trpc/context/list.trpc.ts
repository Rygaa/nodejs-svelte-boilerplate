import { z } from "zod";
import { protectedProcedure } from "../../index";
import { db } from "../../db";
import { contexts, users } from "../../db/schema";
import { eq, ilike, count, desc, and } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

const listContextsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  search: z.string().optional(),
});

export const listContexts = protectedProcedure.input(listContextsSchema).query(async ({ input, ctx }) => {
  return await catchErrors(async (globalTx) => {
    const { limit, offset, search } = input;

    // Build where clause conditions
    const whereConditions = [eq(contexts.userId, ctx.user.userId)];

    if (search) {
      whereConditions.push(ilike(contexts.content, `%${search}%`));
    }

    // Get contexts with pagination
    const [contextsList, [totalCountResult]] = await Promise.all([
      globalTx
        .select({
          id: contexts.id,
          content: contexts.content,
          isDefault: contexts.isDefault,
          userId: contexts.userId,
          createdAt: contexts.createdAt,
          updatedAt: contexts.updatedAt,
          user: {
            id: users.id,
            username: users.username,
            email: users.email,
          },
        })
        .from(contexts)
        .leftJoin(users, eq(contexts.userId, users.id))
        .where(whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0])
        .orderBy(desc(contexts.createdAt))
        .limit(limit)
        .offset(offset),
      globalTx
        .select({ count: count() })
        .from(contexts)
        .where(whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0]),
    ]);

    const totalCount = totalCountResult.count;

    return {
      contexts: contextsList,
      meta: {
        totalCount,
        hasMore: offset + limit < totalCount,
        limit,
        offset,
      },
    };
  });
});
