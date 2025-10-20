import { z } from "zod";
import { protectedProcedure } from "../../index";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { protonMailConfigs } from "../../db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;
const ALGORITHM = "aes-256-cbc";

function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("EMAIL_ENCRYPTION_KEY environment variable is required");
  }
  const textParts = encryptedText.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encrypted = textParts.join(":");
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export const getProtonConfig = protectedProcedure.input(z.object({}).optional()).query(async ({ ctx }) => {
  try {
    const [config] = await db
      .select()
      .from(protonMailConfigs)
      .where(eq(protonMailConfigs.userId, ctx.user!.userId));

    if (!config) {
      return {
        success: true,
        config: null,
        message: "No ProtonMail configuration found",
      };
    }

    // Return config without the password for security
    const safeConfig = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      username: config.username,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      hasPassword: true, // Indicate that a password exists
    };

    return {
      success: true,
      config: safeConfig,
      message: "ProtonMail configuration retrieved successfully",
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to get ProtonMail configuration",
    });
  }
});
