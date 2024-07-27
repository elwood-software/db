import { type Kysely, sql } from "../src/deps.ts";
import { createTable } from "../src/lib/create-table.ts";
import { TableName, TypeName } from "../src/constants.ts";

export async function up(db: Kysely): Promise<void> {
  await db.schema.createType(TypeName.StudioWebhookDirection).asEnum([
    "INBOUND",
    "OUTBOUND",
  ]).execute();

  await createTable(db, TableName.StudioWebhook, (tbl) =>
    tbl
      .addColumn(
        "id",
        "uuid",
        (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
      )
      .addColumn(
        "reference_id",
        "text",
        (col) => col.defaultTo(sql`uuid_generate_v4()`),
      )
      .addColumn(
        "direction",
        sql.raw(`elwood.${TypeName.StudioWebhookDirection}`),
        (col) => col.defaultTo("INBOUND").notNull(),
      )
      .addColumn("source", "text", (col) => col.notNull())
      .addColumn("payload", "jsonb", (col) => col.notNull())
      .addColumn("is_processed", "boolean", (col) => col.defaultTo(false))
      .addColumn(
        "created_at",
        "timestamp",
        (col) => col.defaultTo(sql`now()`),
      ));
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropTable(TableName.StudioWebhook).execute();
  await db.schema.dropType(TypeName.StudioWebhookDirection).execute();
}
