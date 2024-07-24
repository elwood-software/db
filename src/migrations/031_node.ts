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
      ).addColumn("parent_id", "uuid")
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("type", "varchar(255)", (col) => col.notNull())
      .addForeignKeyConstraint(
        "node_parent_id_fkey",
        ["parent_id"],
        TableName.NodeType,
        ["id"],
      ).addForeignKeyConstraint(
        "node_type_fkey",
        ["type"],
        TableName.NodeType,
        ["id"],
      ));
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropTable(TableName.Node).execute();
}
