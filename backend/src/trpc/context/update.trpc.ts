import { z } from "zod";
import { protectedProcedure } from "../../index";
import { db } from "../../db";
import { contexts, users } from "../../db/schema";
import { eq, and, ne } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

const updateContextSchema = z.object({
  id: z.string(),
  content: z.string().min(1, "Content is required"),
  isDefault: z.boolean().optional(),
});

export const updateContext = protectedProcedure
  .input(updateContextSchema)
  .mutation(async ({ input, ctx }) => {
    return await catchErrors(async (globalTx) => {
      // First verify the context belongs to the current user
      const [existingContext] = await globalTx
        .select()
        .from(contexts)
        .where(eq(contexts.id, input.id))
        .limit(1);

      if (!existingContext) {
        throw new Error("Context not found");
      }

      if (existingContext.userId !== ctx.user.userId) {
        throw new Error("Not authorized to update this context");
      }

      // If this context is being set as default, remove default from all other contexts for this user
      if (input.isDefault) {
        await globalTx
          .update(contexts)
          .set({ isDefault: false })
          .where(and(eq(contexts.userId, ctx.user.userId), ne(contexts.id, input.id)));
      }

      // Update the context
      const updateData: any = {
        content: input.content,
      };

      if (input.isDefault !== undefined) {
        updateData.isDefault = input.isDefault;
      }

      const [context] = await globalTx
        .update(contexts)
        .set(updateData)
        .where(eq(contexts.id, input.id))
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
