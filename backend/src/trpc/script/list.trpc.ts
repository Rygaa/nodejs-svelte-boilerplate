import { protectedProcedure } from "../../index";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

// Get all available scripts from the scripts folder
export const list = protectedProcedure.input(z.object({})).query(async ({ ctx }) => {
  // Only ROOT users can access scripts
  const [user] = await db.select().from(users).where(eq(users.id, ctx.user!.userId));

  if (!user || user.role !== "ROOT") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only ROOT users can access scripts",
    });
  }

  try {
    const scripts = [];

    // Only scan TypeScript scripts from src/scripts directory
    const srcScriptsDir = path.join(process.cwd(), "src", "scripts");

    try {
      await fs.access(srcScriptsDir);
      const files = await fs.readdir(srcScriptsDir);
      const scriptFiles = files.filter((file) => file.endsWith(".ts"));

      const tsScripts = await Promise.all(
        scriptFiles.map(async (file) => {
          const sourceFilePath = path.join(srcScriptsDir, file);
          const scriptName = path.basename(file, ".ts");

          // Check if the compiled version exists
          const compiledPath = path.join(process.cwd(), "dist", "scripts", `${scriptName}.js`);

          try {
            const sourceStats = await fs.stat(sourceFilePath);
            const compiledStats = await fs.stat(compiledPath);

            return {
              name: scriptName,
              filename: file,
              type: "typescript",
              size: sourceStats.size,
              lastModified: sourceStats.mtime.toISOString(),
              compiled: true,
              compiledSize: compiledStats.size,
            };
          } catch {
            // Compiled version doesn't exist
            const sourceStats = await fs.stat(sourceFilePath);

            return {
              name: scriptName,
              filename: file,
              type: "typescript",
              size: sourceStats.size,
              lastModified: sourceStats.mtime.toISOString(),
              compiled: false,
            };
          }
        })
      );

      scripts.push(...tsScripts);
    } catch {
      // src/scripts directory not found
    }

    return {
      message: "Scripts retrieved successfully",
      scripts,
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to read scripts directory",
    });
  }
});
