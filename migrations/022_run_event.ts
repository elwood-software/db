import { type Kysely, sql } from "@/deps.ts";
import { createTable } from "@/lib/create-table.ts";

import { TableName, ViewName } from "@/constants.ts";

export async function up(db: Kysely<any>): Promise<void> {
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

  await sql`GRANT USAGE ON SEQUENCE elwood.run_event_id_seq TO service_role;`
    .execute(db);

  await db.withSchema("public").schema.createView(ViewName.RunEvent).as(
    db.selectFrom(TableName.RunEvent)
      .select("id")
      .select("created_at")
      .select("type")
      .select("tracking_id")
      .select("data")
      .where(
        "instance_id",
        "=",
        sql`elwood.current_instance_id()`,
      ),
  )
    .orReplace()
    .execute();

  await sql`alter view public.${
    sql.id(ViewName.RunEvent)
  } SET  (security_invoker=on);`.execute(db);

  await sql`alter publication supabase_realtime add table elwood.run_event;`
    .execute(db);

  await sql`create policy "allow service role to read all run_event"
            on "elwood"."run_event"
            as PERMISSIVE
            for ALL
            to service_role
            using (true);`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable(TableName.RunEvent).cascade().execute();
  await db.schema.dropView(ViewName.RunEvent).execute();
}
