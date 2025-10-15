import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  uniqueIndex,
  json,
  decimal,
} from "drizzle-orm/pg-core";
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

// Hunter.io filters table
export const hunterIOFilters = pgTable("hunter_io_filters", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  value: json("value").notNull(),
  meta: json("meta"),
  isUsed: boolean("is_used").default(false).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Company contact emails table (for storing actual email addresses from various sources)
export const companyContactEmails = pgTable(
  "company_contact_emails",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    companyId: text("company_id").notNull(),
    email: text("email").notNull(), // email address
    type: text("type"), // personal, generic, etc.
    confidence: decimal("confidence", { precision: 5, scale: 2 }), // confidence score from source
    firstName: text("first_name"),
    lastName: text("last_name"),
    position: text("position"),
    linkedin: text("linkedin"),
    twitter: text("twitter"),
    phoneNumber: text("phone_number"),
    verification: boolean("verification").default(false).notNull(),
    meta: json("meta"), // store the whole response as JSON
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("company_contact_emails_company_email_key").on(table.companyId, table.email)]
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
export type Context = typeof contexts.$inferSelect;
export type NewContext = typeof contexts.$inferInsert;
export type ProtonMailConfig = typeof protonMailConfigs.$inferSelect;
export type NewProtonMailConfig = typeof protonMailConfigs.$inferInsert;
export type HunterIOFilter = typeof hunterIOFilters.$inferSelect;
export type NewHunterIOFilter = typeof hunterIOFilters.$inferInsert;
export type CompanyContactEmail = typeof companyContactEmails.$inferSelect;
export type NewCompanyContactEmail = typeof companyContactEmails.$inferInsert;
