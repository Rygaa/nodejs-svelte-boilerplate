/**
 * Generate Email Service
 * - Calls OpenAI Chat Completions to return a compact JSON with subject/body/snippets
 * - Uses context template with personalization replacement
 */

import axios from "axios";

// Type definitions
interface Company {
  id: string;
  domain: string;
  organization?: string | null;
  personalization?: string | null;
}

interface EmailGenerationRequest {
  company: Company;
  model?: string;
  context: string;
  shouldReturnJson?: boolean;
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIRequest {
  model: string;
  temperature: number;
  messages: OpenAIMessage[];
}

interface OpenAIChoice {
  message?: {
    content?: string;
  };
}

interface OpenAIResponse {
  choices?: OpenAIChoice[];
}

interface OpenAIAPIRequest {
  prompt: string;
  model: string;
  shouldReturnJson?: boolean;
}

function buildEmailPrompt({ company, context }: { company: Company; context: string }): string {
  const personalizationText = company.personalization || "No personalization data available";

  if (context && typeof context === "string") {
    return context.replace("#$#@$", personalizationText);
  }

  return context;
}

async function callOpenAIAPI({ prompt, model, shouldReturnJson = false }: OpenAIAPIRequest): Promise<string> {
  const systemMessage = shouldReturnJson
    ? "You are a concise sales copywriter. Output only JSON."
    : "You are a professional sales copywriter.";

  const requestBody: OpenAIRequest = {
    model,
    temperature: 0.15,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: prompt },
    ],
  };

  const response = await axios.post<OpenAIResponse>(
    "https://api.openai.com/v1/chat/completions",
    requestBody,
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return response.data?.choices?.[0]?.message?.content || "";
}

async function askOpenAIEmail({
  company,
  model = "gpt-4o-mini",
  context,
  shouldReturnJson = false,
}: EmailGenerationRequest): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return "Missing OPENAI_API_KEY";
  }

  const prompt = buildEmailPrompt({ company, context });

  const rawResponse = await callOpenAIAPI({ prompt, model, shouldReturnJson });

  return rawResponse;
}

export { askOpenAIEmail };
