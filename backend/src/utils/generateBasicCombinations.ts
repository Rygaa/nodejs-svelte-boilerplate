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
}

/**
 * Generate all possible valid combinations of filters (country–city–headcount–keyword–industry),
 * including empty (null) possibilities for each dimension.
 */
export function generateBasicCombinations(
  inputFilters: InputFilters,
  options: GenerationOptions = {}
): {
  country: string | null;
  state: string | null;
  city: string | null;
  combination: Record<string, any>;
  filterIds: string[];
}[] {
  const results: any[] = [];
  const { headcounts, keywords, industries, countries } = inputFilters;

  // --- Core combination loops (each includes null option) ---
  for (const h of [...headcounts, null]) {
    for (const ind of [...industries, null]) {
      for (const countryData of [
        ...countries,
        { country: null, states: [{ state: null, cities: [null] }] },
      ]) {
        const { country, states } = countryData;
        for (const stateData of states) {
          const { state, cities } = stateData;
          for (const ci of [...cities, null]) {
            for (const k of [...keywords, null]) {
              if (options.maxCombo && results.length >= options.maxCombo) return results;

              // Skip combinations where all values are null (empty filter)
              if (!h && !ind && !country && !state && !ci && !k) continue;

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
                          ...(state && country === "US" && { state: state }),
                          ...(ci && { city: ci }),
                        },
                      ],
                    },
                  }),
                },
                filterIds: [], // Empty array since we're not using database filter IDs
              });
            }
          }
        }
      }
    }
  }

  return results;
}
