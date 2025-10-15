/* ---------------------- Fetch helpers ---------------------- */
import path from "path";
import { generateBasicCombinations, InputFilters } from "../utils/generateBasicCombinations";
import * as fs from "fs";

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

/* ---------------------- Website snapshot ---------------------- */

function stripScriptsStyles(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMetaTags(html: string): Array<{ name: string; content: string }> {
  const metas: Array<{ name: string; content: string }> = [];
  const metaRegex = /<meta\s+([^>]*?)\/?>/gi;
  let m;
  while ((m = metaRegex.exec(html)) !== null) {
    const attrs = m[1] || "";
    const nameMatch = /(?:name|property|itemprop)\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const contentMatch = /content\s*=\s*["']([^"']+)["']/i.exec(attrs);
    if (nameMatch && contentMatch) {
      metas.push({ name: nameMatch[1], content: contentMatch[1] });
    }
  }
  return metas.slice(0, 200);
}

async function fetchOne(url: string): Promise<any> {
  try {
    const res = await timedFetch(url, { method: "GET" }, 15000);
    if (!res.ok) {
      return null;
    }
    const html = await res.text();
    const text = stripScriptsStyles(html);

    return {
      url,
      meta: extractMetaTags(html),
      text: text.slice(0, 12000), // per page cap
    };
  } catch (error: any) {
    return null;
  }
}

function urlJoin(base: string, path: string): string {
  try {
    return new URL(path, base).toString();
  } catch {
    if (base.endsWith("/") && path.startsWith("/")) return base + path.slice(1);
    if (!base.endsWith("/") && !path.startsWith("/")) return base + "/" + path;
    return base + path;
  }
}

export async function fetchSiteSnapshotMulti(domain: string): Promise<any> {
  if (!domain) return { ok: false, pages: [], error: "No domain" };

  const clean = String(domain)
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  const bases = [`https://${clean}`];

  // High-signal pages to boost useful context
  const paths = [
    "/",
    "/about",
    "/solutions",
    "/products",
    "/resources",
    "/press",
    "/blog",
    "/careers",
    "/team",
    "/contact",
  ];

  for (const base of bases) {
    const pages = [];
    for (const p of paths) {
      const u = p === "/" ? base : urlJoin(base, p);
      const snap = await fetchOne(u);
      if (snap) pages.push(snap);
    }
    if (pages.length > 0) {
      const meta = pages.flatMap((p) => p.meta).slice(0, 300);
      const combinedText = pages
        .map((p) => `### ${p.url}\n${p.text}`)
        .join("\n\n")
        .slice(0, 24000);
      return { ok: true, base, pages, meta, combinedText };
    }
  }
  return { ok: false, pages: [], error: "Could not fetch site" };
}

interface FilterData {
  countries: Array<{
    name: string;
    code: string;
    states: Array<{
      name: string;
      cities: string[];
    }>;
  }>;
  headcounts: string[];
  keywords: string[];
  industries: string[];
}

export async function parseFiltersJsonFile(): Promise<any> {
  // Read input filters from filter.json file
  const filtersPath = path.join(__dirname, "../../data/filters.json");

  if (!fs.existsSync(filtersPath)) {
    throw new Error(`Filter file not found at: ${filtersPath}`);
  }

  const filterData: FilterData = JSON.parse(fs.readFileSync(filtersPath, "utf8"));

  // Transform the filter data to match our InputFilters interface
  const inputFilters: InputFilters = {
    headcounts: filterData.headcounts,
    keywords: filterData.keywords,
    industries: filterData.industries,
    countries: filterData.countries.map((country) => ({
      country: country.code,
      states: country.states.map((state) => ({
        state: state.name,
        cities: state.cities,
      })),
    })),
  };
  return inputFilters;
}
