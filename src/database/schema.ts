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

const timestamps = {
  updatedAt: timestamp().defaultNow().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
};

export const installations = pgTable(
  "installations",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().notNull(),
    installationId: text().notNull(),
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

export const changelogs = pgTable(
  "changelogs",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().notNull(),
    installationId: uuid().notNull(),
    repositoryId: integer().notNull(),
    owner: text().notNull(),
    name: text().notNull(),
    raw: text().notNull(),
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

export const versions = pgTable("versions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text().notNull(),
  changelogId: uuid().notNull(),
  version: text().notNull(),
  releaseDate: timestamp(),
  content: json().notNull(),
  ...timestamps,
});

export const versionRelations = relations(versions, ({ one }) => ({
  changelog: one(changelogs, {
    fields: [versions.changelogId],
    references: [changelogs.id],
  }),
}));
