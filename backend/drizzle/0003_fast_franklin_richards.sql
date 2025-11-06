CREATE TABLE "annotations" (
	"id" text PRIMARY KEY NOT NULL,
	"fileId" text NOT NULL,
	"userId" text NOT NULL,
	"comment" text NOT NULL,
	"positionX" text NOT NULL,
	"positionY" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
