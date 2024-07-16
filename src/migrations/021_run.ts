import { type Kysely, sql } from "../deps.ts";
import { createTable } from "../create-table.ts";
import { createFunction } from "../create-function.ts";
import { JsonValue } from "../json.ts";

import { TableName, ViewName } from "../constants.ts";

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
      .addColumn("summary", "text")
      .addColumn("short_summary", "varchar(255)")
      .addColumn("workflow_id", "uuid", (col) => col.notNull())
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
      .addColumn("metadata", "jsonb", (col) => col.defaultTo(sql`'{}'::jsonb`))
      .addColumn("variables", "jsonb", (col) => col.defaultTo(sql`'{}'::jsonb`))
      .addColumn("started_at", "timestamptz")
      .addColumn("ended_at", "timestamptz")
      .addForeignKeyConstraint(
        "elwood_run_workflow_id",
        ["workflow_id"],
        TableName.RunWorkflow,
        ["id"],
      )
      .addUniqueConstraint("idx_elwood_run_tracking_id", ["tracking_id"]));

  await sql`alter publication supabase_realtime add table elwood.run;`
    .execute(db);

  await sql`GRANT USAGE ON SEQUENCE elwood.run_id_seq TO service_role;`.execute(
    db,
  );

  await db.withSchema("public").schema.createView(ViewName.Run).as(
    db.selectFrom(TableName.Run)
      .selectAll()
      .select((q) =>
        q.selectFrom("elwood.run_workflow").select("configuration").where(
          "id",
          "=",
          q.ref("workflow_id"),
        ).as("configuration")
      )
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
      
      IF _current_num IS NULL THEN
        _current_num := 0;
      END IF;

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

  await createFunction(db, {
    name: "before_run_update",
    returns: "trigger",
    declare: [],
    body: `
      NEW.metadata = NEW.metadata || OLD.metadata;
      return NEW;
    `,
  });

  await sql`
    CREATE TRIGGER trigger_before_run_update
    BEFORE UPDATE
    ON elwood.run
    FOR EACH ROW
    EXECUTE FUNCTION elwood.before_run_update();
  `.execute(db);

  await db.withSchema("public").schema.createView(ViewName.RunTriggers).as(
    db.selectFrom(TableName.Run)
      .select(() => [
        sql<string>`"metadata"->>'trigger'`.as("trigger"),
      ])
      .where(
        "instance_id",
        "=",
        sql`elwood.current_instance_id()`,
      )
      .where(sql`"metadata"->>'trigger'`, "is not", null)
      .distinct(),
  )
    .orReplace()
    .execute();

  await sql`alter view public.${
    sql.id(ViewName.RunTriggers)
  } SET  (security_invoker=on);`.execute(db);
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropTable(TableName.Run).cascade().execute();
  await db.schema.dropView(ViewName.Run).execute();
}
