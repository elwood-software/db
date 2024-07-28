import { type Kysely, sql } from "../src/deps.ts";
import { createTable } from "../src/lib/create-table.ts";

import { TableName, TypeName } from "../src/constants.ts";

export async function up(db: Kysely): Promise<void> {
  await db.schema.createType(TypeName.StudioPlanStatus).asEnum([
    "ACTIVE",
    "EXPIRED",
    "UNLISTED",
    "MIGRATED",
  ]).execute();

  await createTable(db, TableName.StudioPlan, (tbl) =>
    tbl
      .addColumn(
        "id",
        "uuid",
        (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
      )
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("description", "text", (col) => col)
      .addColumn(
        "status",
        sql.raw(`elwood.${TypeName.StudioPlanStatus}`),
        (col) => col.notNull().defaultTo("ACTIVE"),
      )
      .addColumn("prices", sql`jsonb[]`, (col) =>
        col.notNull().defaultTo(sql`ARRAY[]::jsonb[]`))
      .addColumn("metadata", "jsonb", (col) =>
        col.defaultTo(sql`'{}'`))
      .addColumn(
        "created_at",
        "timestamp",
        (col) =>
          col.defaultTo(sql`now()`),
      ));

  await createTable(db, TableName.StudioNodePlan, (tbl) =>
    tbl
      .addColumn(
        "id",
        "uuid",
        (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
      )
      .addColumn(
        "node_id",
        "uuid",
        (col) => col.notNull(),
      )
      .addColumn(
        "plan_id",
        "uuid",
        (col) => col.notNull(),
      )
      .addColumn(
        "created_at",
        "timestamp",
        (col) => col.defaultTo(sql`now()`),
      )
      .addForeignKeyConstraint(
        "studio_node_plan_plan_id_fk",
        ["plan_id"],
        TableName.StudioPlan,
        ["id"],
      )
      .addForeignKeyConstraint(
        "studio_node_plan_node_id_fk",
        ["node_id"],
        TableName.Node,
        ["id"],
      ).addUniqueConstraint("studio_node_plan_node_id_plan_id_idx", [
        "instance_id",
        "node_id",
        "plan_id",
      ]));
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropTable(TableName.StudioPlan).execute();
  await db.schema.dropTable(TableName.StudioNodePlan).execute();
}
