import { z } from "zod";
import { protectedProcedure } from "../../index";
import { TRPCError } from "@trpc/server";
import { scriptManager } from "../../services/scriptManager.service";

export const getScripts = protectedProcedure.input(z.object({}).optional()).query(async ({ ctx }) => {
  try {
    const scripts = scriptManager.getScripts();

    return {
      success: true,
      scripts,
      count: scripts.length,
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to get scripts",
    });
  }
});
