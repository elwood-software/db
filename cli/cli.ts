import * as path from "node:path";
import { default as pg } from "npm:pg";
import { parseArgs } from "jsr:@std/cli";
import * as dotenv from "jsr:@std/dotenv";
import { Kysely, PostgresDialect } from "kysely";

import type { ElwoodDatabaseTables } from "@/types.ts";
import { migrate } from "./migrate.ts";
import { seed } from "./seed.ts";

const __dirname = new URL(".", import.meta.url).pathname;
const { _ } = parseArgs(Deno.args, {});
const [cmd, subCommand] = _ as string[];

dotenv.loadSync({
  envPath: path.join(__dirname, "../.env"),
  export: true,
});

const db = new Kysely<ElwoodDatabaseTables>({
  dialect: new PostgresDialect({
    pool: new pg.Pool({
      connectionString: Deno.env.get("DB_URL") ??
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    }),
  }),
});

console.log(`Running command: ${cmd} ${subCommand}`);

try {
  switch (cmd) {
    case "migrate": {
      await migrate(db, __dirname, subCommand);
      break;
    }
    case "seed": {
      seed(db, __dirname);
      break;
    }
    default:
      throw new Error(`unknown command: ${cmd}`);
  }
} catch (error) {
  console.error("Error!");
  console.error(error);
  Deno.exit(1);
} finally {
  await db.destroy();
}
