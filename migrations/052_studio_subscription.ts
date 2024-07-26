import { type Kysely, sql } from "../src/deps.ts";
import { createTable } from "../src/lib/create-table.ts";

import { TableName, TypeName } from "../src/constants.ts";

export async function up(db: Kysely): Promise<void> {
  await db.schema.createType(TypeName.StudioSubscriptionStatus).asEnum([
    "ACTIVE",
    "CANCELED",
    "EXPIRED",
    "HOLD",
  ]).execute();

  await createTable(db, TableName.StudioSubscription, (tbl) =>
    tbl
      .addColumn(
        "id",
        "uuid",
        (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
      )
      .addColumn(
        "profile_id",
        "uuid",
        (col) => col.notNull(),
      )
      .addColumn("metadata", "jsonb", (col) => col.defaultTo(sql`'{}'`))
      .addColumn("plan_id", "uuid", (col) => col.notNull())
      .addColumn(
        "status",
        sql.raw(`"elwood"."${TypeName.StudioSubscriptionStatus}"`),
        (col) => col.notNull().defaultTo(sql`'HOLD'`),
      )
      .addColumn("node_id", "uuid", (col) => col.notNull())
      .addUniqueConstraint("studio_subscription_instance_profile_id__idx", [
        "instance_id",
        "profile_id",
      ])
      .addForeignKeyConstraint(
        "studio_subscription_node_id_fkey",
        ["node_id"],
        TableName.Node,
        ["id"],
      )
      .addForeignKeyConstraint(
        "studio_subscription_profile_id_fkey",
        ["profile_id"],
        TableName.StudioProfile,
        ["id"],
      )
      .addForeignKeyConstraint(
        "studio_subscription_plan_id_fkey",
        ["plan_id"],
        TableName.StudioPlan,
        ["id"],
      ));
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropTable(TableName.Node).execute();
}
