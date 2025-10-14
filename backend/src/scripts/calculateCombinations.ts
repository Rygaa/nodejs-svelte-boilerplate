import { db } from "../db";
import { filters } from "../db/schema";
import { generateBasicCombinations, InputFilters } from "../utils/generateBasicCombinations";

export async function calculateCombinations(): Promise<number> {
  const allFilters = await db.select().from(filters);
  if (allFilters.length === 0) throw new Error("No filters found in database");

  // --- Build full InputFilters object directly ---
  const inputFilters: InputFilters = {
    headcounts: allFilters.filter((f) => f.type === "headcount").map((f) => f.value),
    keywords: allFilters.filter((f) => f.type === "keyword").map((f) => f.value),
    industries: allFilters.filter((f) => f.type === "industry").map((f) => f.value),

    // Build structured countries list with their respective states and cities
    countries: (() => {
      const countryFilters = allFilters.filter((f) => f.type === "country");
      const cityFilters = allFilters.filter((f) => f.type === "city");
      const stateFilters = cityFilters
        .filter((f) => f.details)
        .filter((v, i, a) => a.findIndex((t) => t.value === v.value) === i);
      return countryFilters.map((country) => ({
        country: country.value,
        states: stateFilters.map((state) => {
          if (!state.details) throw new Error("State filter missing details");
          return {
            state: state.details,
            cities: cityFilters.filter((city) => city.details === state.details).map((city) => city.value),
          };
        }),
      }));
    })(),
  };

  const combinations = await generateBasicCombinations(inputFilters, { maxCombo: 10_000_000 });
  console.log(`Total combinations: ${combinations.length}`);
  return combinations.length;
}
