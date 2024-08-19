import { type AnyKysely, sql } from "@/deps.ts";
import { createTable } from "@/lib/create-table.ts";

import { TableName } from "@/constants.ts";

export async function up(db: AnyKysely): Promise<void> {
  // run
  await createTable(db, TableName.Setting, (tbl) =>
    tbl
      .addColumn(
        "name",
        "varchar",
        (col) => col.primaryKey(),
      )
      .addColumn(
        "created_at",
        "timestamptz",
        (col) => col.notNull().defaultTo(sql`now()`),
      )
      .addColumn("value", "text", (col) => col)
      .addColumn(
        "data",
        "jsonb",
        (col) => col.notNull().defaultTo(sql`'{}'::jsonb`),
      )
      .addUniqueConstraint("idx_elwood_setting_name", ["name", "instance_id"]));
}

export async function down(db: AnyKysely): Promise<void> {
  await db.schema.dropTable(TableName.Setting).execute();
}
