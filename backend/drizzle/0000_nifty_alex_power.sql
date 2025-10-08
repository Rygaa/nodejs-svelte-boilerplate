CREATE TYPE "public"."UserRole" AS ENUM('USER', 'ADMIN', 'ROOT');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"firstName" text,
	"lastName" text,
	"avatar" text,
	"role" "UserRole" DEFAULT 'USER' NOT NULL,
	"webPushSubscriptionContainer" text[] DEFAULT '{}' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
