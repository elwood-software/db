import { type Kysely, sql } from "../src/deps.ts";
import { createTable } from "../src/lib/create-table.ts";

import { TableName } from "../src/constants.ts";

export async function up(db: Kysely): Promise<void> {
  await createTable(db, TableName.StudioProfile, (tbl) =>
    tbl
      .addColumn(
        "id",
        "uuid",
        (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
      )
      .addColumn("user_id", "uuid", (col) => col.notNull())
      .addColumn("metadata", "jsonb", (col) => col.defaultTo(sql`'{}'`)));
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropTable(TableName.Node).execute();
}
