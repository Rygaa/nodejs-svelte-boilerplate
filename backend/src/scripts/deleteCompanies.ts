import { db } from "../db";
import { companies } from "../db/schema";
import { sql } from "drizzle-orm";
import type { Database } from "../db";

export async function deleteCompanies(tx: Database | null = null) {
  const client = tx || db;

  // Count existing records before deletion
  const [{ companyCount }] = await client.select({ companyCount: sql<number>`count(*)` }).from(companies);

  const totalCount = Number(companyCount);

  if (totalCount === 0) {
    return {
      success: true,
      deletedCompanies: 0,
      totalDeleted: 0,
    };
  }

  // Get count before deletion for return value
  const companiesCount = Number(companyCount);

  // Delete all companies
  await client.delete(companies);

  return {
    success: true,
    deletedCompanies: companiesCount,
    totalDeleted: companiesCount,
  };
}

export default deleteCompanies;
