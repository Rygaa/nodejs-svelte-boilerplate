import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { v4 as uuidv4 } from "uuid";

export const userRoleEnum = pgEnum("UserRole", ["USER", "ADMIN", "ROOT"]);
export const folderTypeEnum = pgEnum("FolderType", ["FOLDER", "JPEG_CONTAINER"]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  email: text("email").notNull().unique(),
  username: text("username"),
  password: text("password").notNull(),
  firstName: text("firstName"),
  lastName: text("lastName"),
  avatar: text("avatar"),
  role: userRoleEnum("role").notNull().default("USER"),
  webPushSubscriptionContainer: text("webPushSubscriptionContainer").array().notNull().default([]),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  subscriptionEndDate: timestamp("subscriptionEndDate"),
  lastCheckoutId: text("lastCheckoutId"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
