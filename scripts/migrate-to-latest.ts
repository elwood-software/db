#!/usr/bin/env deno run -A

import * as path from "node:path";
import { default as pg } from "npm:pg";
import { promises as fs } from "node:fs";
import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  PostgresDialect,
} from "npm:kysely";

const __dirname = new URL(".", import.meta.url).pathname;

const db = new Kysely<any>({
  dialect: new PostgresDialect({
    pool: new pg.Pool({
      connectionString:
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    }),
  }),
});

const hasElwoodSchema = (await db.introspection.getSchemas()).map((it) =>
  it.name
).includes("elwood");

if (!hasElwoodSchema) {
  await db.schema.createSchema("elwood").execute();
}

const migrator = new Migrator({
  db: db.withSchema("elwood"),
  provider: new FileMigrationProvider({
    fs,
    path,
    // This needs to be an absolute path.
    migrationFolder: path.join(__dirname, "../src/migrations"),
  }),
});

await migrator.migrateDown();

const { error, results } = await migrator.migrateToLatest();

results?.forEach((it) => {
  if (it.status === "Success") {
    console.log(`migration "${it.migrationName}" was executed successfully`);
  } else if (it.status === "Error") {
    console.error(`failed to execute migration "${it.migrationName}"`);
  }
});

if (error) {
  console.error("failed to migrate");
  console.error(error);
  Deno.exit(1);
}

await db.destroy();
