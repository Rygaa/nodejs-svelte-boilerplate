import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../index";
import { users } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

export const list = protectedProcedure
  .input(
    z.object({
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
    })
  )
  .query(async ({ ctx }) => {
    return await catchErrors(async (globalTx) => {
      // Only ROOT users can list all users
      const [currentUser] = await globalTx.select().from(users).where(eq(users.id, ctx.user!.userId));

      if (!currentUser || currentUser.role !== "ROOT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only ROOT users can list users",
        });
      }

      const usersList = await globalTx
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

      return {
        users: usersList,
        message: "Users retrieved successfully",
      };
    });
  });
