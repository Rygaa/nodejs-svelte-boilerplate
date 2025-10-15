import { z } from "zod";
import { protectedProcedure } from "../../index";
import { TRPCError } from "@trpc/server";
import { hunterRequest } from "../../services/hunter.service";
import { logger } from "../../services/logger.service";
import { db } from "../../db";
import { companyContactEmails, companies } from "../../db/schema";
import { eq, and } from "drizzle-orm";

export const findEmails = protectedProcedure
  .input(
    z.object({
      domain: z.string().min(1, "Domain is required"),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      // Check if user has proper permissions (optional, based on your auth setup)
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const { domain } = input;

      // Prepare query parameters for Hunter.io domain search API
      const searchParams = new URLSearchParams({
        domain,
      });

      logger.info({
        message: "Finding emails for domain",
        source: "findEmails",
        data: { domain },
      });

      // Call Hunter.io domain search API
      const hunterResponse = await hunterRequest(`/v2/domain-search?${searchParams.toString()}`, {
        method: "GET",
      });

      if (!hunterResponse?.data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid response from Hunter.io API",
        });
      }

      const emails = hunterResponse.data.emails || [];
      const domain_info = hunterResponse.data.domain || {};
      const meta = hunterResponse.data.meta || {};

      // Find the company by domain to get company ID
      const company = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.domain, domain))
        .limit(1);

      if (company.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Company with domain ${domain} not found`,
        });
      }

      const companyId = company[0].id;
      let savedEmails = 0;

      // Save emails to database
      for (const email of emails) {
        if (!email.value) continue;

        try {
          // Check if email already exists for this company
          const existingEmail = await db
            .select({ id: companyContactEmails.id })
            .from(companyContactEmails)
            .where(
              and(eq(companyContactEmails.companyId, companyId), eq(companyContactEmails.email, email.value))
            )
            .limit(1);

          if (existingEmail.length === 0) {
            // Save new email
            await db.insert(companyContactEmails).values({
              companyId,
              email: email.value,
              type: email.type || null,
              confidence: email.confidence ? email.confidence.toString() : null,
              firstName: email.first_name || null,
              lastName: email.last_name || null,
              position: email.position || null,
              linkedin: email.linkedin || null,
              twitter: email.twitter || null,
              phoneNumber: email.phone_number || null,
              verification: false,
              meta: hunterResponse.data, // Store the whole Hunter.io response
            });
            savedEmails++;
          }
        } catch (dbError: any) {
          logger.error({
            message: "Error saving email to database",
            source: "findEmails",
            data: {
              email: email.value,
              companyId,
              error: dbError?.message || "Unknown error",
            },
          });
          // Continue with other emails even if one fails
        }
      }

      logger.success({
        message: `Found ${emails.length} emails for domain ${domain}, saved ${savedEmails} new emails`,
        source: "findEmails",
        data: { domain, emailCount: emails.length, savedCount: savedEmails },
      });

      return {
        success: true,
        data: {
          emails: emails.map((email: any) => ({
            value: email.value,
            type: email.type,
            confidence: email.confidence,
            sources:
              email.sources?.map((source: any) => ({
                domain: source.domain,
                uri: source.uri,
                extracted_on: source.extracted_on,
                last_seen_on: source.last_seen_on,
                still_on_page: source.still_on_page,
              })) || [],
            first_name: email.first_name,
            last_name: email.last_name,
            position: email.position,
            seniority: email.seniority,
            department: email.department,
            linkedin: email.linkedin,
            twitter: email.twitter,
            phone_number: email.phone_number,
          })),
          domain: {
            domain: domain_info.domain,
            organization: domain_info.organization,
            country: domain_info.country,
            industry: domain_info.industry,
            description: domain_info.description,
            website_url: domain_info.website_url,
            company_type: domain_info.company_type,
            size: domain_info.size,
            founded: domain_info.founded,
            postal_code: domain_info.postal_code,
            state: domain_info.state,
            city: domain_info.city,
            street: domain_info.street,
          },
          meta: {
            results: meta.results,
            limit: meta.limit,
            offset: meta.offset,
            params: meta.params,
          },
        },
      };
    } catch (error: any) {
      logger.error({
        message: "Error finding emails",
        source: "findEmails",
        data: {
          domain: input.domain,
          error: error?.message || "Unknown error",
          stack: error?.stack,
        },
      });

      if (error instanceof TRPCError) {
        throw error;
      }

      // Handle Hunter.io API specific errors
      if (error?.response?.status === 401) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid Hunter.io API key",
        });
      }

      if (error?.response?.status === 429) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Hunter.io API rate limit exceeded",
        });
      }

      if (error?.response?.status === 402) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Hunter.io API quota exceeded",
        });
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error?.message || "Failed to find emails",
      });
    }
  });
