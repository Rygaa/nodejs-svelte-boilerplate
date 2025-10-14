import { z } from "zod";
import { protectedProcedure } from "../../index";
import { db } from "../../db";
import { companies, companyEmails } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

const getCompanyEmailsSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
});

export const getCompanyEmails = protectedProcedure
  .input(getCompanyEmailsSchema)
  .query(async ({ input, ctx }) => {
    return await catchErrors(async (globalTx) => {
      const { companyId } = input;
      const userId = ctx.user.userId;

      // Get all company emails for this company and user
      const emails = await globalTx
        .select({
          id: companyEmails.id,
          subject: companyEmails.subject,
          body: companyEmails.body,
          snippets: companyEmails.snippets,
          notes: companyEmails.notes,
          createdAt: companyEmails.createdAt,
          updatedAt: companyEmails.updatedAt,
          company: {
            id: companies.id,
            domain: companies.domain,
            organization: companies.organization,
          },
        })
        .from(companyEmails)
        .innerJoin(companies, eq(companyEmails.companyId, companies.id))
        .where(and(eq(companyEmails.companyId, companyId), eq(companyEmails.userId, userId)));

      return {
        emails: emails,
      };
    });
  });
