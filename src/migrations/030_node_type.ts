import { type Kysely, sql } from "../deps.ts";
import { createTable } from "../create-table.ts";

import { TableName } from "../constants.ts";

export async function up(db: Kysely): Promise<void> {
  await createTable(db, TableName.NodeType, (tbl) =>
    tbl
      .addColumn(
        "id",
        "varchar(255)",
        (col) => col.primaryKey(),
      )
      .addColumn("display_name", "text", (col) => col.notNull())
      .addColumn("metadata", "jsonb", (col) => col.defaultTo(sql`'{}'`)));
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropTable(TableName.NodeType).execute();
}
