CREATE TABLE "protonmail_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"host" text DEFAULT '127.0.0.1' NOT NULL,
	"port" integer DEFAULT 1025 NOT NULL,
	"secure" boolean DEFAULT false NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"from_name" text NOT NULL,
	"from_email" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_tested" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "protonmail_configs_user_id_key" ON "protonmail_configs" USING btree ("user_id");