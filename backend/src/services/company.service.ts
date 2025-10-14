import { TRPCError } from "@trpc/server";
import { catchErrors } from "../utils/catchErrors";
import { fetchSiteSnapshotMulti } from "./parser.service";
import { db } from "../db";
import { companies, emailsCounts } from "../db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger.service";

/* ---------------------- Fetch helpers ---------------------- */

function ensureFetch() {
  if (globalThis.fetch) return globalThis.fetch;
  try {
    return require("node-fetch");
  } catch {
    throw new Error("Global fetch not found. Use Node 18+ or install node-fetch.");
  }
}

async function timedFetch(url: string, opts: any = {}, timeoutMs: number = 15000) {
  const fetch = ensureFetch();
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/* ---------------------- OpenAI Integration ---------------------- */

function buildPersonalizationPrompt({ domain, organization, site }: any) {
  const pagesList = (site?.pages || []).map((p: any) => p.url).join(", ");
  const textPreview = (site?.combinedText || "").slice(0, 22000);

  return `
You are analyzing the company below based on their website content.

STYLE:
- Write in clear, natural text (not JSON).
- Structure the output into sections like a company profile or research note.
- Include everything relevant you can find: industry, size, headquarters, offerings, technology, customers, partnerships, culture, etc.
- It's okay to make **reasonable inferences** if they are strongly suggested by the text (e.g., "they offer cloud-based software" → likely SaaS).
- If something is uncertain, mention it briefly instead of skipping it.
- Focus on being comprehensive, insightful, and easy to read.

Suggested sections (include only what makes sense):
1. **Overview** – Who they are, what they do.  
2. **Industry & Business Model** – Sector, type of company, how they operate.  
3. **Products & Services** – Main offerings and value proposition.  
4. **Customers & Markets** – Who they target and where they operate.  
5. **Team & Leadership** – Key people if mentioned.  
6. **Technology & Tools** – Any stack or platforms referenced.  
7. **Partnerships & Recognition** – Partners, certifications, awards, etc.  
8. **Recent Activity** – News, initiatives, announcements.  
9. **Culture & Values** – Anything about mission, values, work culture.  
10. **Insights** – Observations, possible pain points, growth stage, or strategic direction.

TARGET COMPANY CONTEXT:
- domain: ${domain || "null"}
- organization: ${organization || "null"}
- pages analyzed: ${pagesList || "none"}

TARGET Website text (sanitized & truncated):
${textPreview}
`.trim();
}

async function askOpenAIPersonalization({ domain, organization, site, model = "gpt-5-nano" }: any) {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, data: null, error: "Missing OPENAI_API_KEY" };
  }

  const fetch = ensureFetch();
  const prompt = buildPersonalizationPrompt({ domain, organization, site });

  try {
    const res = await timedFetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are a business research analyst. Write a single, continuous professional paragraph that captures every available detail about the company. Do not use bullet points, lists, or section headers. Include all relevant specifics such as industry, size, offerings, customers, markets, technologies, leadership, culture, and any other insights you can find. The tone should be formal, precise, and information-rich, like a research analyst's memo.",
            },
            { role: "user", content: prompt },
          ],
        }),
      },
      35000
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");

      return { ok: false, data: null, error: `OpenAI ${res.status}: ${text}` };
    }

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content || "";

    // Since we're expecting natural text, not JSON, return the raw response
    return { ok: true, data: raw };
  } catch (err: any) {
    return { ok: false, data: null, error: err?.message || String(err) };
  }
}

/* ---------------------- Company Service Functions ---------------------- */

export async function personalizeCompany(companyId: string) {
  return await catchErrors(async (globalTx) => {
    // Find the company in the database - try by ID first, then by domain
    let [company] = await globalTx.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    logger.success({
      message: `Personalization ${company?.domain} (${company?.id})`,
      source: "company.service.ts",
      data: company,
    });

    // Also get email counts if company exists
    let emailCount = null;
    if (company) {
      const [emailCountResult] = await globalTx
        .select()
        .from(emailsCounts)
        .where(eq(emailsCounts.companyId, company.id))
        .limit(1);
      emailCount = emailCountResult;
    }

    // If not found by ID, try to find by domain (in case ID is actually a domain-based identifier)
    if (!company) {
      // Extract domain from domain-based identifier (e.g., "1trn.com-133" -> "1trn.com")
      const potentialDomain = companyId.split("-")[0];
      const [companyResult] = await globalTx
        .select()
        .from(companies)
        .where(eq(companies.domain, potentialDomain))
        .limit(1);

      company = companyResult;

      if (company) {
        const [emailCountResult] = await globalTx
          .select()
          .from(emailsCounts)
          .where(eq(emailsCounts.companyId, company.id))
          .limit(1);
        emailCount = emailCountResult;
      }
    }

    if (!company) {
      logger.error({
        message: `Company not found: ${companyId}`,
        source: "company.service.ts",
        data: { companyId },
      });
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Company not found",
      });
    }

    const domain = String(company.domain || "").trim();
    const organization = company.organization || null;

    let site = { ok: false, base: null, pages: [], meta: [], combinedText: "" };
    if (domain) {
      site = await fetchSiteSnapshotMulti(domain);
    }

    const ai = await askOpenAIPersonalization({ domain, organization, site, model: "gpt-4o-mini" });

    if (!ai.ok) {
      logger.error({
        message: `Personalization failed for ${company.domain}: ${ai.error}`,
        source: "company.service.ts",
        data: { companyId, domain, error: ai.error },
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ai.error || "Failed to generate personalization",
      });
    }

    const personalizationData = ai.data;

    // Save personalization data to the company
    const [updatedCompany] = await globalTx
      .update(companies)
      .set({
        personalization: JSON.stringify(personalizationData),
        personalizationDone: true,
        personalizedAt: new Date(),
      })
      .where(eq(companies.id, company.id))
      .returning();

    logger.success({
      message: `Personalization saved for ${company.domain} (${company.id})`,
      source: "company.service.ts",
      data: { updatedCompany },
    });

    return {
      success: true,
      company: {
        ...updatedCompany,
        personalization: personalizationData,
      },
    };
  }, 60000); // 60 second timeout for personalization operations
}
