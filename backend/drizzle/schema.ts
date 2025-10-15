import { pgTable, text, timestamp, boolean, uniqueIndex, integer, unique, json, numeric, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const emailSource = pgEnum("EmailSource", ['HUNTER_IO', 'MANUAL', 'APOLLO', 'LEMLIST', 'OTHER'])
export const userRole = pgEnum("UserRole", ['USER', 'ADMIN', 'ROOT'])


export const companyEmails = pgTable("company_emails", {
	id: text().primaryKey().notNull(),
	subject: text(),
	body: text(),
	snippets: text().array().default([""]).notNull(),
	notes: text(),
	companyId: text("company_id").notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const contexts = pgTable("contexts", {
	id: text().primaryKey().notNull(),
	content: text().notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const emailsCounts = pgTable("emails_counts", {
	id: text().primaryKey().notNull(),
	companyId: text("company_id").notNull(),
	personal: integer().default(0).notNull(),
	generic: integer().default(0).notNull(),
	total: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("emails_counts_company_id_key").using("btree", table.companyId.asc().nullsLast().op("text_ops")),
]);

export const companies = pgTable("companies", {
	id: text().primaryKey().notNull(),
	domain: text().notNull(),
	organization: text(),
	industry: text(),
	country: text(),
	state: text(),
	city: text(),
	headcount: text(),
	companyType: text("company_type"),
	yearFounded: integer("year_founded"),
	personalization: text(),
	personalizationDone: boolean("personalization_done").default(false).notNull(),
	personalizedAt: timestamp("personalized_at", { mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("companies_domain_key").using("btree", table.domain.asc().nullsLast().op("text_ops")),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	firstName: text(),
	lastName: text(),
	avatar: text(),
	role: userRole().default('USER').notNull(),
	webPushSubscriptionContainer: text().array().default([""]).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
	unique("users_username_unique").on(table.username),
]);

export const protonmailConfigs = pgTable("protonmail_configs", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	host: text().default('127.0.0.1').notNull(),
	port: integer().default(1025).notNull(),
	secure: boolean().default(false).notNull(),
	username: text().notNull(),
	password: text().notNull(),
	fromName: text("from_name").notNull(),
	fromEmail: text("from_email").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	lastTested: timestamp("last_tested", { mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("protonmail_configs_user_id_key").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const hunterIoFilters = pgTable("hunter_io_filters", {
	id: text().primaryKey().notNull(),
	isUsed: boolean("is_used").default(false).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	value: json().notNull(),
	meta: json(),
});

export const companyContactEmails = pgTable("company_contact_emails", {
	id: text().primaryKey().notNull(),
	companyId: text("company_id").notNull(),
	email: text().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	fullName: text("full_name"),
	position: text(),
	seniority: text(),
	department: text(),
	linkedinUrl: text("linkedin_url"),
	twitterHandle: text("twitter_handle"),
	phoneNumber: text("phone_number"),
	emailType: text("email_type"),
	confidence: numeric({ precision: 5, scale:  2 }),
	source: emailSource().default('HUNTER_IO').notNull(),
	sourceData: json("source_data"),
	isVerified: boolean("is_verified").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	lastVerified: timestamp("last_verified", { mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("company_contact_emails_company_email_key").using("btree", table.companyId.asc().nullsLast().op("text_ops"), table.email.asc().nullsLast().op("text_ops")),
]);
