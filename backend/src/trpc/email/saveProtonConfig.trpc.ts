import { z } from "zod";
import { protectedProcedure } from "../../index";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { protonMailConfigs } from "../../db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;
const ALGORITHM = "aes-256-cbc";

function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("EMAIL_ENCRYPTION_KEY environment variable is required");
  }
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

const saveProtonConfigSchema = z.object({
  config: z.object({
    host: z.string().min(1, "Host is required"),
    port: z.number().min(1).max(65535, "Port must be between 1-65535"),
    secure: z.boolean(),
    username: z.string().email("Username must be a valid email"),
    password: z.string().optional(), // Make password optional for updates
    fromName: z.string().min(1, "From name is required"),
    fromEmail: z.string().email("From email must be a valid email"),
  }),
});

export const saveProtonConfig = protectedProcedure
  .input(saveProtonConfigSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const { config } = input;

      const existingConfig = await db
        .select()
        .from(protonMailConfigs)
        .where(eq(protonMailConfigs.userId, ctx.user!.userId));

      if (existingConfig.length > 0) {
        // Update existing config
        const updateData: any = {
          host: config.host,
          port: config.port,
          secure: config.secure,
          username: config.username,
          fromName: config.fromName,
          fromEmail: config.fromEmail,
          updatedAt: new Date(),
        };

        // Only update password if provided
        if (config.password && config.password.trim() !== "") {
          updateData.password = encrypt(config.password);
        }

        await db
          .update(protonMailConfigs)
          .set(updateData)
          .where(eq(protonMailConfigs.userId, ctx.user!.userId));
      } else {
        // Create new config - password is required for new configs
        if (!config.password || config.password.trim() === "") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Password is required for new configuration",
          });
        }

        await db.insert(protonMailConfigs).values({
          userId: ctx.user!.userId,
          host: config.host,
          port: config.port,
          secure: config.secure,
          username: config.username,
          password: encrypt(config.password),
          fromName: config.fromName,
          fromEmail: config.fromEmail,
        });
      }

      return {
        success: true,
        message: "ProtonMail configuration saved successfully",
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to save ProtonMail configuration",
      });
    }
  });
