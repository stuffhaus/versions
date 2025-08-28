import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

const timestamps = {
  updated_at: timestamp().defaultNow().notNull(),
  created_at: timestamp().defaultNow().notNull(),
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
