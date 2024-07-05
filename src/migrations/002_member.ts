import { type Kysely, sql } from "../deps.ts";
import { createTable } from "../create-table.ts";
import { createFunction } from "../create-function.ts";

enum TableName {
  Member = "member",
}

enum ViewName {
  Member = "elwood_member",
}

export async function up(db: Kysely): Promise<void> {
  // run
  await createTable(db, TableName.Member, (tbl) =>
    tbl
      .addColumn(
        "id",
        "uuid",
        (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
      )
      .addColumn("user_id", "uuid", (col) => col.notNull())
      .addColumn("type", "text", (col) => col.notNull().defaultTo("user"))
      .addColumn("username", "text", (col) => col.notNull())
      .addColumn("display_name", "text", (col) => col.notNull())
      .addColumn("added_by_user_id", "uuid", (col) => col)
      .addForeignKeyConstraint(
        "elwood_member_user_id",
        ["user_id"],
        "auth.users",
        ["id"],
      )
      .addForeignKeyConstraint(
        "elwood_added_by_user_id",
        ["added_by_user_id"],
        "auth.users",
        ["id"],
      )
      .addUniqueConstraint("idx_elwood_member_user_id", [
        "instance_id",
        "user_id",
      ])
      .addUniqueConstraint("idx_elwood_member_username", [
        "instance_id",
        "username",
      ]));

  await db.withSchema("public").schema.createView(ViewName.Member).orReplace()
    .as(
      db.selectFrom(TableName.Member)
        .select("id")
        .select("user_id")
        .select("type")
        .select("username")
        .select("display_name")
        .select("added_by_user_id")
        .where(
          "instance_id",
          "=",
          sql`elwood.current_instance_id()`,
        ),
    )
    .execute();

  await sql`alter view public.${
    sql.id(ViewName.Member)
  } SET  (security_invoker=on);`.execute(db);

  await createFunction(db, {
    securityDefiner: true,
    name: "is_member",
    returns: "boolean",
    args: [["not_read_only", "boolean", "false"]],
    body: `
        if not_read_only then
          return exists (
            select 1 from elwood.member
            where auth.uid() = user_id AND "role" != 'MEMBER_RO'
          );
        end if;

        return exists (
          select 1 from elwood.member
          where auth.uid() = user_id 
        );
      `,
  });

  await sql`
      create policy "Members can view all members."
      on elwood.member for select
      to authenticated
      using (elwood.is_member());
    `.execute(db);
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropTable(TableName.Member).execute();
}
