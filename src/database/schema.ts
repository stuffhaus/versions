import { relations } from "drizzle-orm";
import {
  integer,
  json,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Shared timestamp fields for all tables
const timestamps = {
  updatedAt: timestamp().defaultNow().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
};

// GitHub App installations per user
export const installations = pgTable(
  "installations",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().notNull(), // Stack Auth user ID
    installationId: text().notNull(), // GitHub installation ID
    ...timestamps,
  },
  (table) => [
    unique("installation_id_unique").on(table.installationId),
    unique("user_installation_unique").on(table.userId, table.installationId),
  ],
);

export const installationRelations = relations(installations, ({ many }) => ({
  changelogs: many(changelogs),
}));

// Changelog files from GitHub repositories
export const changelogs = pgTable(
  "changelogs",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().notNull(),
    installationId: uuid().notNull(), // References installations.id
    repositoryId: integer().notNull(), // GitHub repository ID
    owner: text().notNull(), // Repository owner (e.g., "facebook")
    name: text().notNull(), // Repository name (e.g., "react")
    description: text(), // Changelog description
    raw: text().notNull(), // Raw CHANGELOG.md content
    ...timestamps,
  },
  (table) => [unique("changelog_repo_unique").on(table.owner, table.name)],
);

export const changelogRelations = relations(changelogs, ({ one, many }) => ({
  installation: one(installations, {
    fields: [changelogs.installationId],
    references: [installations.id],
  }),
  versions: many(versions),
}));

// Parsed changelog versions with structured data
export const versions = pgTable("versions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text().notNull(),
  changelogId: uuid().notNull(), // References changelogs.id
  version: text().notNull(), // Version number (e.g., "1.2.3")
  releaseDate: timestamp(), // Release date from changelog
  content: text().notNull(), // Parsed markdown content for this version
  reactions: json().$type<Record<string, number>>().default({}), // Reaction counts (e.g., { wave: 4, heart: 2 })
  ...timestamps,
});

export const versionRelations = relations(versions, ({ one }) => ({
  changelog: one(changelogs, {
    fields: [versions.changelogId],
    references: [changelogs.id],
  }),
}));
