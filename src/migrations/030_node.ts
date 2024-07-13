import { type Kysely, sql } from "../deps.ts";
import { createTable } from "../create-table.ts";

import { TableName } from "../constants.ts";

export async function up(db: Kysely): Promise<void> {
  await createTable(db, TableName.Node, (tbl) =>
    tbl
      .addColumn(
        "id",
        "uuid",
        (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
      ));
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropTable(TableName.Node).execute();
}
