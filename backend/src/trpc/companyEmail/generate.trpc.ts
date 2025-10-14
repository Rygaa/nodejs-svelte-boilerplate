import { z } from "zod";
import { protectedProcedure } from "../../index";
import { db } from "../../db";
import { companies, companyEmails } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";
import { askOpenAIEmail } from "../../services/openai.service";
import { personalizeCompany } from "../../services/company.service";

const generateEmailSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
  context: z.string().min(1, "Context is required"),
  model: z.string().optional().default("gpt-4o-mini"),
});

export const generateEmail = protectedProcedure
  .input(generateEmailSchema)
  .mutation(async ({ input, ctx }) => {
    return await catchErrors(async (globalTx) => {
      const { companyId, context, model } = input;
      const userId = ctx.user.userId;

      // Check if company exists - try by ID first, then by domain
      let [company] = await globalTx.select().from(companies).where(eq(companies.id, companyId)).limit(1);

      // If not found by ID, try to find by domain
      if (!company) {
        const potentialDomain = companyId.split("-")[0];
        const [companyResult] = await globalTx
          .select()
          .from(companies)
          .where(eq(companies.domain, potentialDomain))
          .limit(1);
        company = companyResult;
      }

      if (!company) {
        throw new Error("Company not found");
      }

      // Check if personalization is done, if not, run personalization first
      if (!company.personalizationDone) {
        await personalizeCompany(company.id);

        // Fetch the updated company data after personalization
        const [updatedCompany] = await globalTx
          .select()
          .from(companies)
          .where(eq(companies.id, company.id))
          .limit(1);
        if (updatedCompany) {
          company = updatedCompany;
        }
      }

      // Generate email using OpenAI
      const rawResponse = await askOpenAIEmail({
        company,
        model,
        context,
      });

      if (!rawResponse) {
        throw new Error("No response received from OpenAI");
      }

      const emailData = {
        subject: "Generated Email",
        body: rawResponse,
        snippets: [],
        notes: null,
      };

      // Check if a CompanyEmail already exists for this company/user
      const [existingEmail] = await globalTx
        .select()
        .from(companyEmails)
        .where(and(eq(companyEmails.companyId, company.id), eq(companyEmails.userId, userId)))
        .limit(1);

      let companyEmail;

      if (existingEmail) {
        // Update existing
        const [updatedEmail] = await globalTx
          .update(companyEmails)
          .set({
            subject: emailData.subject || null,
            body: emailData.body || null,
            snippets: emailData.snippets || [],
            notes: emailData.notes || null,
          })
          .where(eq(companyEmails.id, existingEmail.id))
          .returning();

        // Get company info for response
        const [companyInfo] = await globalTx
          .select({
            domain: companies.domain,
            organization: companies.organization,
          })
          .from(companies)
          .where(eq(companies.id, company.id))
          .limit(1);

        companyEmail = {
          ...updatedEmail,
          company: companyInfo,
        };
      } else {
        // Create new
        const [newEmail] = await globalTx
          .insert(companyEmails)
          .values({
            subject: emailData.subject || null,
            body: emailData.body || null,
            snippets: emailData.snippets || [],
            notes: emailData.notes || null,
            companyId: company.id,
            userId: userId,
          })
          .returning();

        // Get company info for response
        const [companyInfo] = await globalTx
          .select({
            domain: companies.domain,
            organization: companies.organization,
          })
          .from(companies)
          .where(eq(companies.id, company.id))
          .limit(1);

        companyEmail = {
          ...newEmail,
          company: companyInfo,
        };
      }

      return {
        message: "Email generated successfully",
        email: companyEmail,
      };
    });
  });
