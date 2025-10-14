import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../index";
import { hunterRequest } from "../../services/hunter.service";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

export const checkHunterHealth = protectedProcedure.mutation(async ({ ctx }) => {
  return await catchErrors(async (globalTx) => {
    // Only ROOT users can check Hunter API health
    const [user] = await globalTx.select().from(users).where(eq(users.id, ctx.user!.userId));

    if (!user || user.role !== "ROOT") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only ROOT users can check Hunter API health",
      });
    }

    try {
      const json = await hunterRequest("/v2/account");

      if (!json?.data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Hunter API health check failed",
        });
      }

      return {
        message: "Hunter API is healthy",
        timestamp: new Date().toISOString(),
        data: json.data,
      };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error?.message || "Hunter API health check failed",
      });
    }
  });
});
