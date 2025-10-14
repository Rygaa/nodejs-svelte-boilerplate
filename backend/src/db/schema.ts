import { pgTable, text, timestamp, pgEnum, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Define the UserRole enum
export const userRoleEnum = pgEnum("UserRole", ["USER", "ADMIN", "ROOT"]);

// Define the users table
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("firstName"),
  lastName: text("lastName"),
  avatar: text("avatar"),
  role: userRoleEnum("role").notNull().default("USER"),
  webPushSubscriptionContainer: text("webPushSubscriptionContainer").array().notNull().default([]),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Companies table
export const companies = pgTable(
  "companies",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    domain: text("domain").notNull(),
    organization: text("organization"),
    industry: text("industry"),
    country: text("country"),
    state: text("state"),
    city: text("city"),
    headcount: text("headcount"),
    companyType: text("company_type"),
    yearFounded: integer("year_founded"),
    personalization: text("personalization"), // JSON string containing personalization data
    personalizationDone: boolean("personalization_done").default(false).notNull(),
    personalizedAt: timestamp("personalized_at"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("companies_domain_key").on(table.domain)]
);

// Company emails table
export const companyEmails = pgTable("company_emails", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  subject: text("subject"),
  body: text("body"),
  snippets: text("snippets").array().notNull().default([]), // Array of alternative opening sentences
  notes: text("notes"),
  companyId: text("company_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Emails count table
export const emailsCounts = pgTable(
  "emails_counts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    companyId: text("company_id").notNull(),
    personal: integer("personal").default(0).notNull(),
    generic: integer("generic").default(0).notNull(),
    total: integer("total").default(0).notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("emails_counts_company_id_key").on(table.companyId)]
);

// Filters table for the discovery system
export const filters = pgTable("filters", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  type: text("type").notNull(), // "country", "city", "headcount", "company_type", "keyword"
  value: text("value").notNull(),
  details: text("details"), // Additional info like country code or state
  bucketName: text("bucket_name"), // For grouping (e.g., country for cities, bucket name for keywords)
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Filter combinations table
export const filterCombinations = pgTable("filter_combinations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Junction table for filter combinations and individual filters
export const combinationFilterItems = pgTable("combination_filter_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  filterId: text("filter_id").notNull(),
  filterCombinationId: text("filter_combination_id").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Context table for email templates and AI context
export const contexts = pgTable("contexts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  content: text("content").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// ProtonMail configuration table
export const protonMailConfigs = pgTable(
  "protonmail_configs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    userId: text("user_id").notNull(),
    host: text("host").notNull().default("127.0.0.1"),
    port: integer("port").notNull().default(1025),
    secure: boolean("secure").notNull().default(false),
    username: text("username").notNull(), // ProtonMail email
    password: text("password").notNull(), // Encrypted Bridge password
    fromName: text("from_name").notNull(),
    fromEmail: text("from_email").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastTested: timestamp("last_tested"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("protonmail_configs_user_id_key").on(table.userId)]
);

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type CompanyEmail = typeof companyEmails.$inferSelect;
export type NewCompanyEmail = typeof companyEmails.$inferInsert;
export type EmailsCount = typeof emailsCounts.$inferSelect;
export type NewEmailsCount = typeof emailsCounts.$inferInsert;
export type Filter = typeof filters.$inferSelect;
export type NewFilter = typeof filters.$inferInsert;
export type FilterCombination = typeof filterCombinations.$inferSelect;
export type NewFilterCombination = typeof filterCombinations.$inferInsert;
export type CombinationFilterItem = typeof combinationFilterItems.$inferSelect;
export type NewCombinationFilterItem = typeof combinationFilterItems.$inferInsert;
export type Context = typeof contexts.$inferSelect;
export type NewContext = typeof contexts.$inferInsert;
export type ProtonMailConfig = typeof protonMailConfigs.$inferSelect;
export type NewProtonMailConfig = typeof protonMailConfigs.$inferInsert;
