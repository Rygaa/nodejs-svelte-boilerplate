import { pgTable, varchar, timestamp, text, integer, uniqueIndex, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const userRole = pgEnum("UserRole", ['USER', 'ADMIN', 'ROOT'])


export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	checksum: varchar({ length: 64 }).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text(),
	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
});

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	firstName: text(),
	lastName: text(),
	avatar: text(),
	role: userRole().default('USER').notNull(),
	webPushSubscriptionContainer: text().array().default(["RAY"]),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("users_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
	uniqueIndex("users_username_key").using("btree", table.username.asc().nullsLast().op("text_ops")),
]);
