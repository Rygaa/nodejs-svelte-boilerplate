import { z } from "zod";
import { protectedProcedure } from "../../index";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { protonMailConfigs } from "../../db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import nodemailer from "nodemailer";

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

export const testConnection = protectedProcedure.input(z.object({}).optional()).mutation(async ({ ctx }) => {
  try {
    const [config] = await db
      .select()
      .from(protonMailConfigs)
      .where(eq(protonMailConfigs.userId, ctx.user!.userId));

    if (!config) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No ProtonMail configuration found. Please save your configuration first.",
      });
    }

    const decryptedPassword = decrypt(config.password);
    console.log(
      `host: ${config.host}, port: ${config.port}, user: ${config.username}, pass: ${decryptedPassword}`
    );
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: decryptedPassword,
      },
      tls: {
        rejectUnauthorized: false, // For ProtonMail Bridge
      },
    });

    await transporter.verify();

    // Update last tested timestamp
    await db
      .update(protonMailConfigs)
      .set({ lastTested: new Date() })
      .where(eq(protonMailConfigs.userId, ctx.user!.userId));

    return {
      success: true,
      message: "Connection to ProtonMail Bridge successful",
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Connection test failed",
    });
  }
});
