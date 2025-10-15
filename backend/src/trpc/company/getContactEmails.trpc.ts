import { z } from "zod";
import { protectedProcedure } from "../../index";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { companyContactEmails } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

export const getCompanyContactEmails = protectedProcedure
  .input(
    z.object({
      companyId: z.string().min(1, "Company ID is required"),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      // Check if user has proper permissions
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const { companyId } = input;

      // Fetch contact emails for the company
      const contactEmails = await db
        .select()
        .from(companyContactEmails)
        .where(eq(companyContactEmails.companyId, companyId))
        .orderBy(desc(companyContactEmails.createdAt));

      return {
        success: true,
        emails: contactEmails.map((email) => ({
          id: email.id,
          email: email.email,
          type: email.type,
          confidence: email.confidence,
          firstName: email.firstName,
          lastName: email.lastName,
          position: email.position,
          linkedin: email.linkedin,
          twitter: email.twitter,
          phoneNumber: email.phoneNumber,
          verification: email.verification,
          meta: email.meta,
          createdAt: email.createdAt,
          updatedAt: email.updatedAt,
        })),
      };
    } catch (error: any) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error?.message || "Failed to fetch company contact emails",
      });
    }
  });
