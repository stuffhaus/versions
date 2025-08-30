ALTER TABLE "versions" RENAME COLUMN "raw" TO "content";--> statement-breakpoint
ALTER TABLE "changelogs" ADD COLUMN "raw" text NOT NULL;