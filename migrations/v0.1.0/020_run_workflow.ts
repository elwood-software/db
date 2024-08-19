import { type AnyKysely, sql } from "@/deps.ts";
import { createTable } from "@/lib/create-table.ts";
import { createFunction } from "@/lib/create-function.ts";

import { TableName, ViewName } from "@/constants.ts";

export async function up(db: AnyKysely): Promise<void> {
  // run
  await createTable(db, TableName.RunWorkflow, (tbl) =>
    tbl
      .addColumn(
        "id",
        "uuid",
        (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
      )
      .addColumn("name", "text")
      .addColumn("configuration", "jsonb")
      .addColumn("metadata", "jsonb")
      .addColumn("version", "smallint", (col) => col.defaultTo(0))
      .addColumn(
        "created_at",
        "timestamptz",
        (col) => col.notNull().defaultTo(sql`now()`),
      ).addUniqueConstraint("idx_elwood_run_workflow_name", [
        "instance_id",
        "name",
        "version",
      ]));

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

  await createFunction(db, {
    name: "before_run_workflow_insert",
    returns: "trigger",
    declare: [
      "_current_version integer;",
    ],
    body: `
      SELECT "version" into _current_version FROM elwood.run_workflow WHERE "name" = NEW.name AND  "instance_id" = elwood.current_instance_id() LIMIT 1; 
      
      IF _current_version IS NULL THEN
        _current_version := 0;
      END IF;

      NEW."name" := NEW."configuration"->>'name';
      NEW."version" := _current_version + 1;
      return NEW;
    `,
  });

  await sql`
    CREATE TRIGGER trigger_before_run_workflow_insert
    BEFORE INSERT
    ON elwood.run_workflow
    FOR EACH ROW
    EXECUTE FUNCTION elwood.before_run_workflow_insert();
  `.execute(db);
}

export async function down(db: AnyKysely): Promise<void> {
  await db.schema.dropTable(TableName.RunWorkflow).cascade().execute();
  await db.schema.dropView(ViewName.RunWorkflow).execute();
}
