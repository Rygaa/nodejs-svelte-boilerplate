import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// Define the UserRole enum
export const userRoleEnum = pgEnum("UserRole", ["USER", "ADMIN", "ROOT"]);

// Define the users table
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
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

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
