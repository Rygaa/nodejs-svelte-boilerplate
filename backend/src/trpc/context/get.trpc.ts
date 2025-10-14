import { z } from "zod";
import { protectedProcedure } from "../../index";
import { db } from "../../db";
import { contexts, users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

export const getContext = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    return await catchErrors(async (globalTx) => {
      const [context] = await globalTx
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
        .where(eq(contexts.id, input.id))
        .limit(1);

      if (!context) {
        throw new Error("Context not found");
      }

      if (context.userId !== ctx.user.userId) {
        throw new Error("Not authorized to access this context");
      }

      return { context };
    });
  });
