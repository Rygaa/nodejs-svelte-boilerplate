import { z } from "zod";
import { protectedProcedure } from "../../index";
import { TRPCError } from "@trpc/server";
import fs from "fs/promises";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";
import path from "path";
import { db } from "../../db";

// Input schema for running a script
const RunScriptInputSchema = z.object({
  scriptName: z.string().min(1, "Script name is required"),
  params: z.record(z.string(), z.any()).optional(),
});

// Execute a specific script
export const execute = protectedProcedure.input(RunScriptInputSchema).mutation(async ({ ctx, input }) => {
  const { scriptName, params = {} } = input;

  if (scriptName === "discoverCompanies") {
    const [user] = await db.select().from(users).where(eq(users.id, ctx.user!.userId));

    if (!user || user.role !== "ROOT") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only ROOT users can execute scripts",
      });
    }
    // Load all available scripts dynamically
    const scripts = await loadScriptFunctions();

    const scriptFn = scripts[scriptName];
    if (!scriptFn) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Script '${scriptName}' not found in /scripts`,
      });
    }

    // Execute and measure runtime
    const startTime = Date.now();
    const result = await scriptFn(db, params);
    const endTime = Date.now();

    return {
      message: "Script executed successfully",
      scriptName,
      executionTime: endTime - startTime,
      output: result ? JSON.stringify(result) : "Function executed successfully",
      error: null,
      success: true,
    };
  } else {
    return await catchErrors(async (globalTx) => {
      // Only ROOT users can run scripts
      const [user] = await globalTx.select().from(users).where(eq(users.id, ctx.user!.userId));

      if (!user || user.role !== "ROOT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only ROOT users can execute scripts",
        });
      }
      // Load all available scripts dynamically
      const scripts = await loadScriptFunctions();

      const scriptFn = scripts[scriptName];
      if (!scriptFn) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Script '${scriptName}' not found in /scripts`,
        });
      }

      // Execute and measure runtime
      const startTime = Date.now();
      const result = await scriptFn(globalTx, params);
      const endTime = Date.now();

      return {
        message: "Script executed successfully",
        scriptName,
        executionTime: endTime - startTime,
        output: result ? JSON.stringify(result) : "Function executed successfully",
        error: null,
        success: true,
      };
    }, 300000); // 5-minute timeout
  }
});

async function loadScriptFunctions() {
  const scriptsDir = path.join(process.cwd(), "src/scripts");
  const files = await fs.readdir(scriptsDir);

  const map: Record<string, (client: any, params?: any) => Promise<any>> = {};

  for (const file of files) {
    const ext = path.extname(file);
    const base = path.basename(file, ext);

    if (![".ts", ".js"].includes(ext)) continue;

    const mod = await import(path.join(scriptsDir, file));

    // Try named export matching filename, or default export, or first function
    const fn = mod[base] ?? mod.default ?? Object.values(mod).find((v) => typeof v === "function");

    if (typeof fn === "function") map[base] = fn;
  }

  return map;
}
