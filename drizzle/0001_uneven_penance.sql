CREATE TABLE "changelogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"installationId" uuid NOT NULL,
	"repositoryId" integer NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "changelog_repo_unique" UNIQUE("owner","name")
);
--> statement-breakpoint
CREATE TABLE "versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"changelogId" uuid NOT NULL,
	"version" text NOT NULL,
	"releaseDate" timestamp,
	"raw" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "installations" RENAME COLUMN "updated_at" TO "updatedAt";--> statement-breakpoint
ALTER TABLE "installations" RENAME COLUMN "created_at" TO "createdAt";