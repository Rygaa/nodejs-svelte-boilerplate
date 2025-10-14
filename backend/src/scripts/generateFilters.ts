import * as fs from "fs";
import * as path from "path";
import { db } from "../db";
import { filters } from "../db/schema";
import type { Database } from "../db";

export async function generateFilters(tx: Database | null = null) {
  const filtersPath = path.join(process.cwd(), "data", "filters.json");
  const raw = fs.readFileSync(filtersPath, "utf-8");
  const data = JSON.parse(raw);

  const client = tx || db;

  // Clear existing filters
  await client.delete(filters);

  // Countries
  for (const country of data.countries) {
    await client.insert(filters).values({
      type: "country",
      value: country.code,
      details: country.name,
    });

    // Handle states for US and Canada
    if (country.states && (country.code === "US" || country.code === "CA")) {
      for (const state of country.states) {
        await client.insert(filters).values({
          type: "state",
          value: state.name,
          bucketName: country.name, // attach to parent country
        });

        for (const city of state.cities) {
          await client.insert(filters).values({
            type: "city",
            value: city,
            details: state.name,
            bucketName: country.name, // attach to parent country
          });
        }
      }
    } else {
      // For other countries without states structure (legacy support)
      if (country.cities) {
        for (const city of country.cities) {
          await client.insert(filters).values({
            type: "city",
            value: city,
            bucketName: country.name, // attach to parent country
          });
        }
      }
    }
  }

  // Headcounts
  for (const headcount of data.headcounts) {
    await client.insert(filters).values({
      type: "headcount",
      value: headcount,
    });
  }

  // Company types
  // for (const companyType of data.company_types) {
  //   await client.insert(filters).values({
  //     type: "company_type",
  //     value: companyType,
  //   });
  // }

  // Industries
  if (data.industries) {
    for (const industry of data.industries) {
      await client.insert(filters).values({
        type: "industry",
        value: industry,
      });
    }
  }

  // Keywords
  if (data.keywords) {
    for (const keyword of data.keywords) {
      await client.insert(filters).values({
        type: "keyword",
        value: keyword,
      });
    }
  }
}

export default generateFilters;
