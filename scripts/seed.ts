import * as path from "node:path";
import { default as pg } from "npm:pg";
import { promises as fs } from "node:fs";
import {
  FileMigrationProvider,
  Kysely,
  Migrator,
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

const seedSql = await Deno.readTextFile(path.join(__dirname, "../seed.sql"));

await sql`${sql.raw(seedSql)}`.execute(db);
