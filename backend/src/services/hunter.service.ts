import axios from "axios";

// Array of different personalities/approaches for the function
const personalities = [
  {
    name: "Formal Corporate",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
    },
    timeout: 10000,
  },
  {
    name: "Mobile User",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.5",
      "X-Requested-With": "XMLHttpRequest",
    },
    timeout: 8000,
  },
  {
    name: "API Client",
    headers: {
      "User-Agent": "axios-zombie-client/1.0.0",
      Accept: "application/json",
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    timeout: 15000,
  },
  {
    name: "Legacy Browser",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/54.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate",
    },
    timeout: 12000,
  },
  {
    name: "Tech Savvy",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
    },
    timeout: 10000,
  },
  {
    name: "Casual Browser",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "X-Requested-With": "XMLHttpRequest",
    },
    timeout: 8000,
  },
  {
    name: "Data Analyst",
    headers: {
      "User-Agent": "axios-zombie-client/1.0.0",
      Accept: "application/json",
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    timeout: 15000,
  },
  {
    name: "Old School",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/54.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate",
    },
    timeout: 12000,
  },
  // Add more personalities as needed
  {
    name: "Standard Browser",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
    },
    timeout: 10000,
  },
  {
    name: "iPhone User",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.5",
      "X-Requested-With": "XMLHttpRequest",
    },
    timeout: 8000,
  },
  {
    name: "JSON API Client",
    headers: {
      "User-Agent": "axios-zombie-client/1.0.0",
      Accept: "application/json",
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    timeout: 15000,
  },
  {
    name: "Vintage Browser",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/54.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate",
    },
    timeout: 12000,
  },
];

// Track current personality to rotate through them
let currentPersonalityIndex = 0;

export async function hunterRequest(
  pathname: string,
  opts: { method?: string; body?: any } = {}
): Promise<any> {
  const { method = "GET", body = null } = opts;
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    throw new Error("HUNTER_API_KEY environment variable is required");
  }
  const url = new URL(`https://api.hunter.io${pathname}`);
  url.searchParams.set("api_key", apiKey);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-KEY": apiKey,
  };
  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Hunter API error ${res.status} ${res.statusText} at ${url.pathname} :: ${text || "no body"}`
    );
  }
  return res.json();
}

export function axiosZombie() {
  // Rotate to next personality
  currentPersonalityIndex = (currentPersonalityIndex + 1) % personalities.length;
  const personality = personalities[currentPersonalityIndex];

  // Create axios instance with current personality
  const instance = axios.create({
    timeout: personality.timeout,
    headers: personality.headers,
    maxRedirects: 5,
  });

  // Add request interceptor to log personality (optional)
  instance.interceptors.request.use((config) => {
    console.log(`🤖 axiosZombie using personality: "${personality.name}"`);
    return config;
  });

  return instance;
}

export async function hunterRequestZombie(
  pathname: string,
  opts: { method?: string; body?: any } = {}
): Promise<any> {
  const { method = "GET", body = null } = opts;
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    throw new Error("HUNTER_API_KEY environment variable is required");
  }
  const url = new URL(`https://api.hunter.io${pathname}`);
  url.searchParams.set("api_key", apiKey);

  try {
    const zombie = axiosZombie();

    const config: any = {
      method: method.toLowerCase(),
      url: url.toString(),
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
    };

    if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
      config.data = body;
    }

    const response = await zombie(config);

    return response.data;
  } catch (error: any) {
    if (error.response) {
      // Axios error with response
      const { status, statusText, data } = error.response;
      const text = typeof data === "string" ? data : JSON.stringify(data);
      throw new Error(`Hunter API error ${status} ${statusText} at ${pathname} :: ${text || "no body"}`);
    } else if (error.request) {
      // Axios error without response (network error)
      throw new Error(`Hunter API network error at ${pathname} :: ${error.message}`);
    } else {
      // Other error
      throw error;
    }
  }
}

// Export for CommonJS compatibility
module.exports = { hunterRequest, hunterRequestZombie };

// Default export for ES modules
export default { hunterRequest };

/* Types for a “domain search” response matching the provided JSON */

export interface DomainSearchResponse {
  data: DomainData;
  meta: Meta;
}

export interface DomainData {
  domain: string;
  disposable: boolean;
  webmail: boolean;
  accept_all: boolean;
  /** Example: "{first}" or "{first}.{last}" */
  pattern: string | null;
  organization: string | null;
  linked_domains: string[];
  emails: Email[];
}

export type EmailType = "personal" | "generic" | "role" | (string & {});

export type Seniority = "junior" | "senior" | "executive" | "manager" | "intern" | "unknown" | (string & {});

export type Department =
  | "it"
  | "engineering"
  | "communication"
  | "executive"
  | "finance"
  | "hr"
  | "legal"
  | "management"
  | "marketing"
  | "sales"
  | "support"
  | "operations"
  | "other"
  | (string & {});

export type VerificationStatus =
  | "valid"
  | "accept_all"
  | "invalid"
  | "webmail"
  | "disposable"
  | "risky"
  | (string & {});

export interface Email {
  /** Full email address */
  value: string;
  type: EmailType;
  /** Confidence score 0–100 */
  confidence: number;
  sources: EmailSource[];
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  /** Unprocessed title as found */
  position_raw: string | null;
  seniority: Seniority | null;
  department: Department | null;
  linkedin: string | null;
  twitter: string | null;
  phone_number: string | null;
  verification: Verification | null;
}

export interface EmailSource {
  /** Source domain (e.g., "github.com") */
  domain: string;
  /** Absolute or canonicalized URL */
  uri: string;
  /** YYYY-MM-DD */
  extracted_on: string | null;
  /** YYYY-MM-DD */
  last_seen_on: string | null;
  still_on_page: boolean;
}

export interface Verification {
  /** YYYY-MM-DD */
  date: string | null;
  status: VerificationStatus;
}

export interface Meta {
  results: number;
  limit: number;
  offset: number;
  params: MetaParams;
}

export interface MetaParams {
  domain: string | null;
  company: string | null;
  type: "" | null;
  seniority: "" | null;
  department: "" | null;
}
