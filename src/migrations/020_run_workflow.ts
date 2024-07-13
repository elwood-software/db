import { type Kysely, sql } from "../deps.ts";
import { createTable } from "../create-table.ts";

import { TableName, ViewName } from "../constants.ts";

export async function up(db: Kysely): Promise<void> {
  // run
  await createTable(db, TableName.RunWorkflow, (tbl) =>
    tbl
      .addColumn(
        "id",
        "uuid",
        (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
      )
      .addColumn("name", "text")
      .addColumn("label", "text")
      .addColumn("description", "text")
      .addColumn("configuration", "jsonb")
      .addColumn("metadata", "jsonb")
      .addColumn("version", "smallint")
      .addColumn(
        "created_at",
        "timestamptz",
        (col) => col.notNull().defaultTo(sql`now()`),
      ));

  await db.withSchema("public").schema.createView(ViewName.RunWorkflow).as(
    db.selectFrom(TableName.RunWorkflow)
      .selectAll()
      .where(
        "instance_id",
        "=",
        sql`elwood.current_instance_id()`,
      ),
  )
    .orReplace()
    .execute();

  await sql`alter view public.${
    sql.id(ViewName.RunWorkflow)
  } SET  (security_invoker=on);`.execute(db);

  await sql`create policy "allow service role to read all run_event"
            on "elwood"."run_workflow"
            as PERMISSIVE
            for ALL
            to service_role
            using (true);`.execute(db);

  await sql`create policy "allow service role to read all run"
            on "elwood"."run_workflow"
            as PERMISSIVE
            for ALL
            to service_role
            using (true);`.execute(db);

  await sql`create policy "allow authenticated to read all run"
            on "elwood"."run_workflow"
            as PERMISSIVE
            for ALL
            to authenticated
            using (true);`.execute(db);
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropTable(TableName.RunWorkflow).cascade().execute();
  await db.schema.dropView(ViewName.RunWorkflow).execute();
}
