import { z } from "zod";
import { protectedProcedure } from "../../index";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { protonMailConfigs } from "../../db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import nodemailer from "nodemailer";

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || "your-32-character-encryption-key!";
const ALGORITHM = "aes-256-cbc";

function decrypt(encryptedText: string): string {
  const textParts = encryptedText.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encrypted = textParts.join(":");
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const sendTestEmailSchema = z.object({
  to: z.string().email("Recipient must be a valid email"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

export const sendTestEmail = protectedProcedure
  .input(sendTestEmailSchema)
  .mutation(async ({ input, ctx }) => {
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

      const mailOptions = {
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: input.to,
        subject: input.subject,
        text: input.body,
        html: `<p>${input.body.replace(/\n/g, "<br>")}</p>`,
      };

      const result = await transporter.sendMail(mailOptions);

      return {
        success: true,
        message: `Test email sent successfully (ID: ${result.messageId})`,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to send test email",
      });
    }
  });
