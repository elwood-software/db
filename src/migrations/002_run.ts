import { type Kysely, sql } from "../deps.ts";
import { createTable } from "../create-table.ts";

enum TableName {
  Run = "run",
  RunEvent = "run_event",
}

enum ViewName {
  Run = "elwood_run",
  RunEvent = "elwood_run_event",
}

export async function up(db: Kysely): Promise<void> {
  // run
  await createTable(db, TableName.Run, (tbl) =>
    tbl
      .addColumn(
        "id",
        "serial",
        (col) => col.primaryKey(),
      )
      .addColumn(
        "created_at",
        "timestamptz",
        (col) => col.notNull().defaultTo(sql`now()`),
      )
      .addColumn("status", "text", (col) => col.notNull().defaultTo("queued"))
      .addColumn("result", "varchar", (col) => col.defaultTo("none"))
      .addColumn(
        "tracking_id",
        "uuid",
        (col) => col.notNull().defaultTo(sql`uuid_generate_v4()`),
      )
      .addColumn(
        "report",
        "jsonb",
        (col) => col.notNull().defaultTo(sql`'{}'::jsonb`),
      )
      .addColumn("configuration", "jsonb")
      .addColumn("metadata", "jsonb")
      .addColumn("variables", "jsonb", (col) => col.defaultTo(sql`'{}'::jsonb`))
      .addColumn("started_at", "timestamptz")
      .addColumn("ended_at", "timestamptz")
      .addUniqueConstraint("idx_elwood_run_tracking_id", ["tracking_id"]));

  // don't let authenticated see the instance_id
  await sql`revoke select (instance_id) on table ${
    sql.id(TableName.Run)
  } from authenticated`.execute(db);

  await db.withSchema("public").schema.createView(ViewName.Run).as(
    db.selectFrom(TableName.Run)
      .selectAll()
      .where(
        "instance_id",
        "=",
        sql`elwood.current_instance_id()`,
      ),
  )
    .orReplace()
    .execute();

  // run event
  await createTable(db, TableName.RunEvent, (tbl) =>
    tbl
      .addColumn(
        "id",
        "serial",
        (col) => col.primaryKey(),
      )
      .addColumn(
        "created_at",
        "timestamptz",
        (col) => col.notNull().defaultTo(sql`now()`),
      )
      .addColumn("type", "text")
      .addColumn(
        "tracking_id",
        "uuid",
        (col) => col.notNull().defaultTo(sql`uuid_generate_v4()`),
      )
      .addColumn(
        "data",
        "jsonb",
        (col) => col.notNull().defaultTo(sql`'{}'::jsonb`),
      ));
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropTable(TableName.Run).execute();
  await db.schema.dropTable(TableName.RunEvent).execute();
}
