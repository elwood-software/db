import { type Kysely, sql } from "../deps.ts";
import { createTable } from "../create-table.ts";
import { createFunction } from "../create-function.ts";

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
      .addColumn(
        "num",
        "integer",
        (col) => col.defaultTo(0),
      )
      .addColumn("configuration", "jsonb")
      .addColumn("metadata", "jsonb")
      .addColumn("variables", "jsonb", (col) => col.defaultTo(sql`'{}'::jsonb`))
      .addColumn("started_at", "timestamptz")
      .addColumn("ended_at", "timestamptz")
      .addUniqueConstraint("idx_elwood_run_tracking_id", ["tracking_id"]));

  await sql`alter publication supabase_realtime add table elwood.run;`
    .execute(db);

  await sql`GRANT USAGE ON SEQUENCE elwood.run_id_seq TO service_role;`.execute(
    db,
  );

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

  await sql`alter view public.${
    sql.id(ViewName.Run)
  } SET  (security_invoker=on);`.execute(db);

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

  await sql`create policy "allow service role to read all run"
            on "elwood"."run"
            as PERMISSIVE
            for ALL
            to service_role
            using (true);`.execute(db);

  await sql`create policy "allow authenticated to read all run"
            on "elwood"."run"
            as PERMISSIVE
            for ALL
            to authenticated
            using (true);`.execute(db);

  await createFunction(db, {
    name: "before_run_insert",
    returns: "trigger",
    declare: [
      "_current_num integer;",
    ],
    body: `
      SELECT "num" into _current_num FROM elwood.run WHERE "instance_id" = elwood.current_instance_id() ORDER BY "num" DESC LIMIT 1; 
      NEW."num" = _current_num + 1;
      return NEW;
    `,
  });

  await sql`
    CREATE TRIGGER trigger_before_run_insert
    BEFORE INSERT
    ON elwood.run
    FOR EACH ROW
    EXECUTE FUNCTION elwood.before_run_insert();
  `.execute(db);
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropTable(TableName.Run).cascade().execute();
  await db.schema.dropTable(TableName.RunEvent).cascade().execute();
  await db.schema.dropView(ViewName.Run).execute();
  await db.schema.dropView(ViewName.RunEvent).execute();
}
