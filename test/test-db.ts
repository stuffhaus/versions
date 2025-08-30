import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/database/schema";

let testDb: ReturnType<typeof drizzle>;
let sql: postgres.Sql;

export async function setupTestDatabase() {
  sql = postgres("postgres://postgres:postgres@localhost:5432/versions_test", {
    max: 5,
    onnotice: () => {},
  });

  testDb = drizzle(sql, { schema });

  await migrate(testDb, { migrationsFolder: "./drizzle" });
  return testDb;
}

export async function teardownTestDatabase() {
  await sql?.end();
}

export function getTestDatabase() {
  if (!testDb) throw new Error("Test database not initialized");

  return testDb;
}

export async function clearTestDatabase() {
  if (!testDb) return;

  await testDb.delete(schema.versions);
  await testDb.delete(schema.changelogs);
  await testDb.delete(schema.installations);
}
