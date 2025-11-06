CREATE TYPE "public"."FolderType" AS ENUM('FOLDER', 'JPEG_CONTAINER');--> statement-breakpoint
ALTER TABLE "folders" ADD COLUMN "type" "FolderType" DEFAULT 'FOLDER' NOT NULL;