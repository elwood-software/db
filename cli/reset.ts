import { type Kysely, sql } from "kysely";

import type { ElwoodDatabaseTables } from "@/types.ts";
import { up } from "./migrate.ts";

export async function reset(
  db: Kysely<ElwoodDatabaseTables>,
  __dirname: string,
): Promise<void> {
  await sql`DROP SCHEMA IF EXISTS elwood CASCADE`.execute(db);
  await up(db, __dirname);
}
