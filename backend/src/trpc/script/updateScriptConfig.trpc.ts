import { z } from "zod";
import { protectedProcedure } from "../../index";
import { TRPCError } from "@trpc/server";
import { scriptManager } from "../../services/scriptManager.service";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

export const updateScriptConfig = protectedProcedure
  .input(
    z.object({
      scriptName: z.string(),
      autoRun: z.boolean().optional(),
      waitTime: z.number().min(60000).optional(), // Minimum 1 minute
      enabled: z.boolean().optional(),
      description: z.string().optional(),
      params: z.record(z.any()).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const { scriptName, ...updates } = input;

      // Only ROOT users can update script configurations
      const [user] = await db.select().from(users).where(eq(users.id, ctx.user!.userId));

      if (!user || user.role !== "ROOT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only ROOT users can update script configurations",
        });
      }

      const success = await scriptManager.updateScript(scriptName, updates);

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Script '${scriptName}' not found`,
        });
      }

      return {
        success: true,
        message: `Script '${scriptName}' configuration updated successfully`,
        updatedFields: Object.keys(updates),
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to update script configuration",
      });
    }
  });
