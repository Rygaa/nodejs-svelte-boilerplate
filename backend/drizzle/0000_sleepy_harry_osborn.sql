CREATE TYPE "public"."UserRole" AS ENUM('USER', 'ADMIN', 'ROOT');--> statement-breakpoint
CREATE TABLE "combination_filter_items" (
	"id" text PRIMARY KEY NOT NULL,
	"filter_id" text NOT NULL,
	"filter_combination_id" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"organization" text,
	"industry" text,
	"country" text,
	"state" text,
	"city" text,
	"headcount" text,
	"company_type" text,
	"year_founded" integer,
	"personalization" text,
	"personalization_done" boolean DEFAULT false NOT NULL,
	"personalized_at" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text,
	"body" text,
	"snippets" text[] DEFAULT '{}' NOT NULL,
	"notes" text,
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contexts" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"user_id" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails_counts" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"personal" integer DEFAULT 0 NOT NULL,
	"generic" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filter_combinations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filters" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"details" text,
	"bucket_name" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX "companies_domain_key" ON "companies" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "emails_counts_company_id_key" ON "emails_counts" USING btree ("company_id");