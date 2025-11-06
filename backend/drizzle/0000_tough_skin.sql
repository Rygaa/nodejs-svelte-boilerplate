CREATE TYPE "public"."UserRole" AS ENUM('USER', 'ADMIN', 'ROOT');--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"parentPath" text,
	"isFile" boolean DEFAULT false NOT NULL,
	"iconName" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text,
	"password" text NOT NULL,
	"firstName" text,
	"lastName" text,
	"avatar" text,
	"role" "UserRole" DEFAULT 'USER' NOT NULL,
	"webPushSubscriptionContainer" text[] DEFAULT '{}' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"subscriptionEndDate" timestamp,
	"lastCheckoutId" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
