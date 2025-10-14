import { z } from "zod";
import { protectedProcedure } from "../../index";
import { db } from "../../db";
import { contexts, users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

const createContextSchema = z.object({
  content: z.string().min(1, "Content is required"),
  isDefault: z.boolean().optional().default(false),
});

export const createContext = protectedProcedure
  .input(createContextSchema)
  .mutation(async ({ input, ctx }) => {
    return await catchErrors(async (globalTx) => {
      // If this context is being set as default, remove default from all other contexts for this user
      if (input.isDefault) {
        await globalTx.update(contexts).set({ isDefault: false }).where(eq(contexts.userId, ctx.user.userId));
      }

      const [context] = await globalTx
        .insert(contexts)
        .values({
          content: input.content,
          isDefault: input.isDefault || false,
          userId: ctx.user.userId,
        })
        .returning();

      // Get the user info for the response
      const [user] = await globalTx
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, ctx.user.userId))
        .limit(1);

      return {
        context: {
          ...context,
          user,
        },
      };
    });
  });
