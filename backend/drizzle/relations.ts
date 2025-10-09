import { relations } from "drizzle-orm/relations";
import { users, companies, companyEmails, emailsCounts } from "./schema";

export const companiesRelations = relations(companies, ({ one, many }) => ({
	emailsCount: one(emailsCounts, {
		fields: [companies.id],
		references: [emailsCounts.companyId],
	}),
	emails: many(companyEmails),
}));

export const companyEmailsRelations = relations(companyEmails, ({ one }) => ({
	company: one(companies, {
		fields: [companyEmails.companyId],
		references: [companies.id],
	}),
	user: one(users, {
		fields: [companyEmails.userId],
		references: [users.id],
	}),
}));

export const emailsCountsRelations = relations(emailsCounts, ({ one }) => ({
	company: one(companies, {
		fields: [emailsCounts.companyId],
		references: [companies.id],
	}),
}));

export const usersRelations = relations(users, ({ many }) => ({
	companyEmails: many(companyEmails),
}));