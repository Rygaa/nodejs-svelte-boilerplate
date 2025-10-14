import { z } from "zod";
import { protectedProcedure } from "../../index";
import { db } from "../../db";
import { contexts } from "../../db/schema";
import { eq } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

export const deleteContext = protectedProcedure
  .input(z.object({ id: z.string() }))
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
        throw new Error("Not authorized to delete this context");
      }

      await globalTx.delete(contexts).where(eq(contexts.id, input.id));

      return { success: true };
    });
  });
