import * as path from "node:path";
import { default as pg } from "npm:pg";
import { Kysely, PostgresDialect, sql } from "npm:kysely";

import * as dotenv from "jsr:@std/dotenv";

const __dirname = new URL(".", import.meta.url).pathname;

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

const seedSql = await Deno.readTextFile(path.join(__dirname, "../seed.sql"));

await sql`${sql.raw(seedSql)}`.execute(db);
