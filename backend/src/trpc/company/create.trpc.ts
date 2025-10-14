import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../index";
import { db } from "../../db";
import { companies, users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

// Input schema for creating a company
const createCompanyInputSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  organization: z.string().optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  headcount: z.string().optional(),
  companyType: z.string().optional(), // Updated to match schema field name
  yearFounded: z.number().optional(), // Updated to match schema field name
});

// Create a new company
export const createCompany = protectedProcedure
  .input(createCompanyInputSchema)
  .mutation(async ({ ctx, input }) => {
    return await catchErrors(async (globalTx) => {
      // Only ROOT users can create companies
      const [user] = await globalTx.select().from(users).where(eq(users.id, ctx.user!.userId));

      if (!user || user.role !== "ROOT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only ROOT users can create companies",
        });
      }

      // Check if company with this domain already exists
      const [existingCompany] = await globalTx
        .select()
        .from(companies)
        .where(eq(companies.domain, input.domain));

      if (existingCompany) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A company with this domain already exists",
        });
      }

      const [company] = await globalTx.insert(companies).values(input).returning();

      return {
        success: true,
        company,
        message: "Company created successfully",
      };
    });
  });

// Seed some sample companies for testing
export const seedSampleCompanies = protectedProcedure.mutation(async ({ ctx }) => {
  return await catchErrors(async (globalTx) => {
    // Only ROOT users can seed companies
    const [user] = await globalTx.select().from(users).where(eq(users.id, ctx.user!.userId));

    if (!user || user.role !== "ROOT") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only ROOT users can seed companies",
      });
    }

    const sampleCompanies = [
      {
        domain: "google.com",
        organization: "Google LLC",
        industry: "Technology",
        country: "United States",
        state: "California",
        city: "Mountain View",
        headcount: "100,000+",
        companyType: "Public", // Updated field name
        yearFounded: 1998, // Updated field name
      },
      {
        domain: "microsoft.com",
        organization: "Microsoft Corporation",
        industry: "Technology",
        country: "United States",
        state: "Washington",
        city: "Redmond",
        headcount: "100,000+",
        companyType: "Public", // Updated field name
        yearFounded: 1975, // Updated field name
      },
      {
        domain: "openai.com",
        organization: "OpenAI",
        industry: "Artificial Intelligence",
        country: "United States",
        state: "California",
        city: "San Francisco",
        headcount: "1,000-5,000",
        companyType: "Private", // Updated field name
        yearFounded: 2015, // Updated field name
      },
      {
        domain: "stripe.com",
        organization: "Stripe, Inc.",
        industry: "Financial Technology",
        country: "United States",
        state: "California",
        city: "San Francisco",
        headcount: "1,000-5,000",
        companyType: "Private", // Updated field name
        yearFounded: 2010, // Updated field name
      },
      {
        domain: "shopify.com",
        organization: "Shopify Inc.",
        industry: "E-commerce",
        country: "Canada",
        state: "Ontario",
        city: "Ottawa",
        headcount: "10,000-50,000",
        companyType: "Public", // Updated field name
        yearFounded: 2006, // Updated field name
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const companyData of sampleCompanies) {
      // Check if company already exists
      const [existingCompany] = await globalTx
        .select()
        .from(companies)
        .where(eq(companies.domain, companyData.domain));

      if (existingCompany) {
        skipped++;
        continue;
      }

      await globalTx.insert(companies).values(companyData);
      created++;
    }

    return {
      success: true,
      message: `Seeded ${created} companies (${skipped} already existed)`,
      stats: { created, skipped, total: sampleCompanies.length },
    };
  });
});
