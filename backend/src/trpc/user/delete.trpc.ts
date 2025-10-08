import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../index";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

const deleteUserSchema = z.object({
  userId: z.string(),
});

export const deleteUser = protectedProcedure.input(deleteUserSchema).mutation(async ({ ctx, input }) => {
  return await catchErrors(async (globalTx) => {
    const { userId } = input;

    // Only ROOT users can delete users
    const [currentUser] = await globalTx.select().from(users).where(eq(users.id, ctx.user!.userId));

    if (!currentUser || currentUser.role !== "ROOT") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only ROOT users can delete users",
      });
    }

    // Check if target user exists
    const [targetUser] = await globalTx.select().from(users).where(eq(users.id, userId));

    if (!targetUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Prevent ROOT users from deleting themselves
    if (userId === ctx.user!.userId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "ROOT users cannot delete themselves",
      });
    }

    // Delete user (this will cascade delete related records)
    await globalTx.delete(users).where(eq(users.id, userId));

    return {
      message: "User deleted successfully",
    };
  });
});
