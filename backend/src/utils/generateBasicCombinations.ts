import { db } from "../db";
import { filters } from "../db/schema";
import { eq, and } from "drizzle-orm";

interface CountryStateCity {
  country: string;
  states: {
    state: string;
    cities: string[];
  }[];
}

export interface InputFilters {
  headcounts: string[];
  keywords: string[];
  industries: string[];
  countries: CountryStateCity[];
}

export interface GenerationOptions {
  maxCombo?: number;
  ignoreNullVariations?: boolean;
}

/**
 * Generate all possible valid combinations of filters (country–city–headcount–keyword–industry),
 * including empty (null) possibilities for each dimension.
 */
export async function generateBasicCombinations(
  inputFilters: InputFilters,
  options: GenerationOptions = {}
): Promise<
  {
    country: string | null;
    state: string | null;
    city: string | null;
    combination: Record<string, any>;
    filterIds: string[];
  }[]
> {
  const results: any[] = [];
  const { headcounts, keywords, industries, countries } = inputFilters;
  const { maxCombo = 10, ignoreNullVariations = false } = options;

  // Load all filters once and build lookup
  const allFilters = await db.select().from(filters);
  const filterByTypeValue = new Map<string, string>();
  for (const f of allFilters) {
    filterByTypeValue.set(`${f.type}:${f.value}`, f.id);
  }

  // --- Core combination loops (conditionally includes null option) ---
  const headcountOptions = ignoreNullVariations ? headcounts : [...headcounts, null];
  const industryOptions = ignoreNullVariations ? industries : [...industries, null];
  const keywordOptions = ignoreNullVariations ? keywords : [...keywords, null];
  const countryOptions = ignoreNullVariations
    ? countries
    : [...countries, { country: null, states: [{ state: null, cities: [null] }] }];

  for (const h of headcountOptions) {
    for (const ind of industryOptions) {
      for (const countryData of countryOptions) {
        const { country, states } = countryData;
        for (const stateData of states) {
          const { state, cities } = stateData;
          const cityOptions = ignoreNullVariations ? cities : [...cities, null];
          for (const ci of cityOptions) {
            for (const k of keywordOptions) {
              if (results.length >= maxCombo) return results;

              const filterIds: string[] = [];
              const hId = h && filterByTypeValue.get(`headcount:${h}`);
              const kId = k && filterByTypeValue.get(`keyword:${k}`);
              const indId = ind && filterByTypeValue.get(`industry:${ind}`);
              const coId = country && filterByTypeValue.get(`country:${country}`);
              const stId = state && filterByTypeValue.get(`state:${state}`);
              const ciId = ci && filterByTypeValue.get(`city:${ci}`);

              if (hId) filterIds.push(hId);
              if (kId) filterIds.push(kId);
              if (indId) filterIds.push(indId);
              if (coId) filterIds.push(coId);
              if (stId) filterIds.push(stId);
              if (ciId) filterIds.push(ciId);

              results.push({
                country,
                state,
                headcount: h,
                city: ci,
                companyType: k,
                combination: {
                  ...(h && { headcount: [h] }),
                  ...(k && { keywords: { include: [k] } }),
                  ...(ind && { industry: { include: [ind] } }),
                  ...(country && {
                    headquarters_location: {
                      include: [
                        {
                          country,
                          ...(state && { state: state }),
                          ...(ci && { city: ci }),
                        },
                      ],
                    },
                  }),
                },
                filterIds,
              });
            }
          }
        }
      }
    }
  }

  return results;
}
