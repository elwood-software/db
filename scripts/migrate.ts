import * as path from "node:path";
import { default as pg } from "npm:pg";
import { promises as fs } from "node:fs";
import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  NO_MIGRATIONS,
  PostgresDialect,
  sql,
} from "npm:kysely";
import { parseArgs } from "https://deno.land/std@0.224.0/cli/mod.ts";
import * as dotenv from "jsr:@std/dotenv";

const __dirname = new URL(".", import.meta.url).pathname;
const args = parseArgs(Deno.args, {});

dotenv.loadSync({
  envPath: path.join(__dirname, "../.env"),
  export: true,
});

const db = new Kysely<any>({
  dialect: new PostgresDialect({
    pool: new pg.Pool({
      connectionString: Deno.env.get("DB_URL") ??
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    }),
  }),
});

const migrator = new Migrator({
  db: db.withSchema("elwood"),
  provider: new FileMigrationProvider({
    fs,
    path,
    // This needs to be an absolute path.
    migrationFolder: path.join(__dirname, "../src/migrations"),
  }),
});

let error: Error | null = null;

switch (args._[0]) {
  case "up":
    await up();
    break;
  case "down":
    await down();
    break;
  case "reset":
    await sql`DROP SCHEMA IF EXISTS elwood CASCADE`.execute(db);
    await up();

    break;
}

if (error) {
  console.error("failed to migrate");
  console.error(error);
  Deno.exit(1);
}

await db.destroy();

async function up() {
  const hasElwoodSchema = (await db.introspection.getSchemas()).map((it) =>
    it.name
  ).includes("elwood");

  if (!hasElwoodSchema) {
    await db.schema.createSchema("elwood").execute();
  }

  await migrator.migrateTo(NO_MIGRATIONS);
  await migrator.migrateToLatest();

  const { error: error_, results } = await migrator.migrateToLatest();
  error = error_ as Error;

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });
}

async function down() {
  await migrator.migrateTo(NO_MIGRATIONS);
}
